import { Injectable } from '@angular/core'; 
import { Geolocation } from '@ionic-native/geolocation';
import { Observable } from 'rxjs/Observable';

import * as math from 'mathjs'; // don't named as Math, this will conflict with Math in JS


enum Roomcolor {
    blank = <any>"#FFFFFF",
    floor = <any>"#FFFFFF",
    lab = <any>"#0098A1",
    lecture = <any>"#39B7BC",
    lift = <any>"#FFFFFF",
    office = <any>"#BBBBBB",
    service = <any>"#BEE2E2",
    staircase = <any>"#FFFFFF",
    wc = <any>"#BEE2E2",
    wcPrivate = <any>"#BBBBBB"
}

enum BuildingLevels {
    Bauwesen = <any>[0, 1],
    Beuth = <any>[0, 1]
}

@Injectable()
export class MapService {  

    public triPoints: any[] = [];

    public wgs84a = 6378137;           // WGS-84 Earth semimajor axis (m)
    public wgs84b = 6356752.3142;      // WGS-84 Earth semiminor axis (m)
    public wgs84f;
    public wgs84a2;
    public wgs84b2;
    public wgs84e;
    public wgs84e2;
    public wgs84ep;

    public googleKey = "AIzaSyCtPKTmtL83e8StfuawkBhXH74kgLcbNF0";

    constructor(private geolocation: Geolocation) {
        this.wgs84f = math.divide(math.subtract(this.wgs84a, this.wgs84b), this.wgs84a); 
        this.wgs84a2 = math.multiply(this.wgs84a, this.wgs84a);
        this.wgs84b2 = math.multiply(this.wgs84b, this.wgs84b);
        this.wgs84e = math.sqrt(math.divide(math.subtract(this.wgs84a2, this.wgs84b2), this.wgs84a2));
        this.wgs84e2 = math.pow(this.wgs84e, 2);
        this.wgs84ep = math.sqrt(math.divide(math.subtract(this.wgs84a2, this.wgs84b2), this.wgs84b2));
    } 

    public getBuildingLevels(building: any) {
        return BuildingLevels[building];
    }

    // POSITION
    public changeCurrentLevel(currentLevel: any, buildingLevels: any, direction: any) {
        let newLevel = currentLevel + direction;
        if (newLevel > buildingLevels[0] - 1 && newLevel < buildingLevels[1] + 1 ) {
            return newLevel;
        } else {
            return currentLevel;
        }
    }

    public createPolygonOptions(paths: any, type: any) {
        let PolygonOptions: any = {
            paths: paths,
            strokeColor: '#000000',
            strokeOpacity: 0.5,
            strokeWeight: 1,
            fillColor: Roomcolor[type],
            fillOpacity: 0.5
        }  
        return PolygonOptions;
    }

    public createPolylineOptions(points: any) {
        let PolylineOptions: any = {
          path: points,
          geodesic: true,
          strokeColor: '#FF0000',
          strokeOpacity: 1.0,
          strokeWeight: 2
        }
        return PolylineOptions;
    }

    public createCircleOptions(position: any, radius: any) {
        let circleOptions: any = {
            center: {lat: position.lat, lng: position.lng},
            strokeWeight: 0,
            fillColor: '#0000FF',
            radius: parseFloat(radius)
        }
        return circleOptions;
    }

    /**
     * 
     * @param zoom Returns circle radius on current zoom level
     */
    public getCircleRadius(zoom: any) {
        let zoomDiff = 18 - zoom;
        switch(true) {
            case (zoomDiff > 0):
                return 3 * (Math.pow(2, zoomDiff));
            case (zoomDiff < 0):
                return 3 / (Math.pow(2, Math.abs(zoomDiff)));
            default:
                return 3;
        }     
    }

    /**
     * Returns the altitude at specific position
     * @param lat 
     * @param lng 
     */
    public getElevation(lat, lng) {
        return Observable.create(observer => {
            let url = 'https://maps.googleapis.com/maps/api/elevation/json?locations=' + lat + ',' + lng + '&key=' + this.googleKey;
            fetch(url).then(res => res.json()).then((results) => {
                let jsonStr = JSON.stringify(results);
                let jsonSub = jsonStr.substring(25);
                let index = jsonSub.indexOf(",");
                //return jsonSub.substring(0, index);
                observer.next(parseFloat(jsonSub.substring(0, index)).toFixed(2));
                observer.complete();
            }).catch(err => console.error(err));
        });
    }

    /**
     * Calculates the centroid of a polygon
     * @param points 
     */
    getPolygonCentroid(points: any[]) {
        console.log("TEST");
        let centroid: any = {lat: 0, lng: 0};
        for (let x in points) {
            console.log("polygon: " + points[x].lat + ", " + points[x].lng);
            centroid.lat += points[x].lat;
            centroid.lng += points[x].lng;
        }
        centroid.lat = centroid.lat / points.length;
        centroid.lng = centroid.lng / points.length;
        return centroid;
    }

    /**
     * Splits full set of string polygon point coordinates to single point coordinates in array
     * @param points 
     */
    splitCoordinatesToLatLng(points: any[]) {
        let paths: any[] = [];
        for (let x in points) {
            let latlngStr: any[] = points[x].split(", ");
            // String to number
            let lat = +latlngStr[0];
            let lng = +latlngStr[1];

            paths.push({lat: lat, lng: lng});
        }
        return paths;
    }   

    getRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    getDegrees(radians) {
        return radians * (180 / Math.PI);
    }

    /**
     * Calculates earth radius at specific latitude
     * @param latitudeRadians
     */
    getEarthR(latitude) {
        // http://en.wikipedia.org/wiki/Earth_radius
        var a = 6378137;
        var b = 6356752.3142;
        var cosLat = math.cos(latitude);
        var sinLat = math.sin(latitude);
        let earthR = math.sqrt(math.divide(
                                math.pow((math.pow(a, 2) * cosLat), 2) + math.pow((math.pow(b, 2) * sinLat), 2),
                                math.pow((a * cosLat), 2) + math.pow((b * sinLat), 2)));
        return earthR;
    }

    /**
     * Returns the radius of curvature at specific position
     * @param latitude
     */
    getN(latitude) {
        let latSin = math.sin(latitude);
        let N = math.divide(this.wgs84a, math.sqrt(1 - this.wgs84e2 * latSin * latSin))
        return N;
    }

    getCurrentPositionGPS() {
        return Observable.create(observer => {
            this.geolocation.getCurrentPosition({enableHighAccuracy:true}).then((position) => {
                //console.log("GPS POSITION: " + position.coords.latitude + ", " + position.coords.longitude);
                let lat = position.coords.latitude;
                let lng = position.coords.longitude;
                //console.log([lat, lng]);
                observer.next({lat: lat, lng: lng});
                observer.complete();
            }, (error) => {
                console.log("" + error);
            });
        });        
    }

    /**
     * Calculates new position from measured compass azimuth and step length
     * @param currentPosition 
     * @param direction 
     */
    getCurrentPositionCompass(currentPosition, dist, direction) {  
        let split = currentPosition.split(",");
        let lat = parseFloat(split[0]);
        let lng = parseFloat(split[1]);
        let distance = dist;
        let azimuth = direction;

        console.log("OLD - LAT: " + lat + ", " + lng);
        console.log("AZIMUTH: " + direction);

        let radians = math.PI / 180.0;
        let degrees = 180.0 / math.PI;
        let latRadians = radians * lat;
        let azRadians = radians * azimuth;
        let earthRad = this.getEarthR(latRadians);
        let cosLat = math.cos(latRadians);
        let cosAz = math.cos(azRadians);
        let sinAz = math.sin(azRadians);
        let ratio = distance / earthRad;
        let targetLat = lat + (degrees * cosAz * ratio);
        let targetLon = lng + (degrees * (sinAz / cosLat) * ratio);
        console.log("NEW - LAT: " + targetLat + ", " + targetLon);
        return targetLat + ", " + targetLon;
    } 

    LLAtoECEF(latitude, longitude, altitude) {
        let lat = this.getRadians(latitude);
        let lng = this.getRadians(longitude);

        let latSin = math.sin(lat);
        let latCos = math.cos(lat)
        let lngSin = math.sin(lng);
        let lngCos = math.cos(lng);

        let N = this.getN(lat);

        let ePoint = [(N + altitude) * latCos * lngCos,
                      (N + altitude) * latCos * lngSin,
                      (math.divide(this.wgs84b2, this.wgs84a2) * N + altitude) * latSin];
        //console.log("ECEF POINT: " + ePoint);
        return ePoint;
    }

    /**
     * 
     * @param x Transformation of ECEF coordinates to LLA coordinates
     * @param y 
     * @param z 
     */
    ECEFtoLLA(x, y, z) {
        //Auxiliary values first
        let p = math.sqrt(x * x + y * y);
        let theta = math.atan(math.divide(math.multiply(z, this.wgs84a), math.multiply(p, this.wgs84b)));

        let sinTheta = math.sin(theta);
        let cosTheta = math.cos(theta);

        let num = z + (this.wgs84ep * this.wgs84ep * this.wgs84b * sinTheta * sinTheta * sinTheta);
        let denom = p - (this.wgs84e * this.wgs84e * this.wgs84a * cosTheta * cosTheta * cosTheta);

        //Now calculate LLA
        let latitude  = math.atan(num / denom);
        let longitude = math.atan(y / x);
        let N = this.getN(latitude);
        let altitude  = (p / math.cos(latitude)) - N;

        if (x < 0 && y < 0) {
            longitude = longitude - math.PI;
        }

        if (x < 0 && y > 0) {
            longitude = longitude + math.PI;
        }

        latitude = this.getDegrees(latitude);
        longitude = this.getDegrees(longitude);

        let latlng = latitude + ", " + longitude;

        return latlng;
    }

    /**
     * Returns trilateraion points of three input points
     * @param beacons
     */
    trilaterate(points: any[]) {
        let ePoints: any[] = [];

        // transform LLA points to ECEF points
        for (let x in points) {
            //console.log("LLA: " + points[x].lat + ", " + points[x].lng + ", " + points[x].height);
            let ePoint = this.LLAtoECEF(+points[x].lat, +points[x].lng, +points[x].height);            
            ePoints.push(ePoint);
        }

        /*#from wikipedia
        #transform to get circle 1 at origin
        #transform to get circle 2 on x axis*/
        let ex = math.divide(math.subtract(ePoints[1], ePoints[0]), math.norm(math.subtract(ePoints[1], ePoints[0])));
        let i = math.dot(ex, math.subtract(ePoints[2], ePoints[0]));
        let ey = math.divide(
                    math.subtract(math.subtract(ePoints[2], ePoints[0]), math.multiply(i, ex)),
                    math.norm(math.subtract(math.subtract(ePoints[2], ePoints[0]), math.multiply(i, ex))));
        let ez = math.cross(ex, ey);
        let d = math.norm(math.subtract(ePoints[1], ePoints[0]));
        let j = math.dot(ey, math.subtract(ePoints[2], ePoints[0]));

        /*#from wikipedia
        #plug and chug using above values*/
        let x = (math.pow(points[0].distance, 2) - math.pow(points[1].distance, 2) + math.pow(d, 2)) / (2 * d);
        let y = ((math.pow(points[0].distance, 2) - math.pow(points[2].distance, 2) + math.pow(i, 2) + math.pow(j, 2)) / (2 * j))
                - ((i / j) * x);   

        // only one case shown here
        let z = math.sqrt(math.abs((math.pow(points[0].distance, 2) - math.pow(x, 2) - math.pow(y, 2))));

        // creates ECEF Array
        let triPt = math.add(math.add(math.add(ePoints[0], math.multiply(x, ex)), math.multiply(y, ey)), math.multiply(z, ez));

        let triLatLng = this.ECEFtoLLA(triPt[0], triPt[1], triPt[2]);
        //console.log("Calculated TriPt: " + triLatLng);
        return triLatLng;
    }         
}