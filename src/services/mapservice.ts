import { Injectable } from '@angular/core'; 
import { Geolocation } from '@ionic-native/geolocation';
import { Observable } from 'rxjs/Observable';

import * as math from 'mathjs';
import * as earcut from 'earcut';

declare let google;

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

    public tLatPoints: any[] = [];

    public ePoints: any[] = [];
    public tAngPoints: any[] = [];

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

    public createPolygonBuildingOptions(paths: any) {
        let PolygonOptions: any = {
            paths: paths,
            strokeColor: '#000000',
            strokeOpacity: 0.5,
            strokeWeight: 1,
            fillColor: '#FF0000',
            fillOpacity: 0.5
        }  
        return PolygonOptions;
    }

    public createPolygonRoomOptions(paths: any, type: any) {
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

    public createPolygonTestOptions(paths: any) {
        let PolygonOptions: any = {
            paths: paths,
            strokeColor: '#000000',
            strokeOpacity: 0.5,
            strokeWeight: 1,
            fillColor: '#000000',
            fillOpacity: 1
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

    public createPolylineRouteOptions(points: any) {
        let PolylineOptions: any = {
          path: points,
          geodesic: true,
          strokeColor: '#FF0000',
          strokeOpacity: 1.0,
          strokeWeight: 3
        }
        return PolylineOptions;
    }

    /**
     * Creates routing polyline for Google map
     * @param points
     */
    public createPolyline(points: any) {
        let polylineOptions: any = {
          path: points,
          geodesic: true,
          strokeColor: '#FF0000',
          strokeOpacity: 1.0,
          strokeWeight: 3
        }
        let polyline = new google.maps.Polyline();
        polyline.setOptions(polylineOptions);
        return polyline;
    }

        /**
     * Creates routing polyline for Google map
     * @param points
     */
    public createPolylineDebug(points: any, color: any) {
        let polylineOptions: any = {
          path: points,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: 1,
          strokeWeight: 3
        }
        let polyline = new google.maps.Polyline();
        polyline.setOptions(polylineOptions);
        return polyline;
    }

    /**
     * Creates routing polyline for Google map
     * @param points
     */
    public createPolylineRoute(points: any) {
        let polylineOptions: any = {
          path: points,
          geodesic: true,
          strokeColor: '#0000FF',
          strokeOpacity: 1.0,
          strokeWeight: 3
        }
        let polyline = new google.maps.Polyline();
        polyline.setOptions(polylineOptions);
        return polyline;
    }

    public createCircleOptions(position: any, radius: any) {
        let circleOptions: any = {
            center: {lat: parseFloat(position.lat), lng: parseFloat(position.lng)},
            strokeWeight: 0,
            fillColor: '#0000FF',
            radius: parseFloat(radius)
        }
        return circleOptions;
    }

        public createCircleOptions2(position: any, radius: any) {
        console.log("CircleOptions: " + position.lat + ", " + position.lng);
        let circleOptions: any = {
            center: {lat: parseFloat(position.lat), lng: parseFloat(position.lng)},
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
     * Calculates the croid of a straight polyline
     * @param point1 
     * @param point2 
     */
    getPolylineCentroid(point1, point2) {
        let centroid: any = {lat: 0, lng: 0};
        centroid.lat = (point1.lat + point2.lat) / 2;
        centroid.lng = (point1.lng + point2.lng) / 2;
        return centroid;
    }

    /**
     * Calculates the centroid of a polygon
     * @param points 
     */
    getPolygonCentroid(points: any[]) {
        let centroid: any = {lat: 0, lng: 0};
        for (let x in points) {
            centroid.lat += points[x].lat;
            centroid.lng += points[x].lng;
        }
        centroid.lat = centroid.lat / points.length;
        centroid.lng = centroid.lng / points.length;
        console.log("Polygon Centroid: " + centroid.lat + ", " + centroid.lng);
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
     * http://cosinekitty.com/compass.html
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
        //console.log("AZIMUTH: " + direction);

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

    /**
     * Returns new LatLng calculated by distance and direction
     * @param position
     * @param distance 
     * @param direction 
     */
    public getLatLngByAzimuthDistance(position, distance, direction) {
        //console.log("Old: " + position.lat + ", " + position.lng);

        let radians = math.PI / 180.0;
        let degrees = 180.0 / math.PI;
        let latRadians = radians * position.lat;
        let azRadians = radians * direction;
        let earthRad = this.getEarthR(latRadians);
        let cosLat = math.cos(latRadians);
        let cosAz = math.cos(azRadians);
        let sinAz = math.sin(azRadians);
        let ratio = distance / earthRad;

        let positionNew = {lat: position.lat + (degrees * cosAz * ratio), lng: position.lng + (degrees * (sinAz / cosLat) * ratio)};
        //console.log("New: " + positionNew.lat + ", " + positionNew.lng);

        return positionNew;
    }

    /**
     * Transformes a point from LLA coordinates to ECEF coordinates
     * @param latitude
     * @param longitude 
     * @param altitude 
     */
    public LLAtoECEF(latitude, longitude, altitude) {
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
     * Transformes a point from ECEF coordinates to LLA coordinates
     * @param x 
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

        return {lat: latitude, lng: longitude};
    }

    /**
     * Returns the trilateraion ECEF coordinate of three input ECEF coordinates
     * @param points
     */
    public trilaterate(points: any[]) {
        let ePoints: any[] = [];

        // transform LLA points to ECEF points
        for (let x in points) {
            //console.log("LLA: " + points[x].lat + ", " + points[x].lng + ", " + points[x].height);
            let ePoint = this.LLAtoECEF(+points[x].lat, +points[x].lng, +points[x].elevation);            
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


    // ############### //
    // ### ROUTING ### //
    // ############### //

    /**
     * Returns triangulation array with all triangle points
     * @param polygonPaths
     */
    public getTriangles(polygonPaths: any) {        
        this.tAngPoints = [];
        for (let x in polygonPaths) {
            // push seperate x and y axis into array for earcut
            this.tAngPoints.push(polygonPaths[x][0]);
            this.tAngPoints.push(polygonPaths[x][1]);
        }
        console.log(this.tAngPoints);
        //console.log(earcut(this.tAngPoints));
        // x-y axis array of all triangle points
        let trianglePoints: any[] = [];
        let triangleIndices = earcut(this.tAngPoints); // 3, 2, 0, 3, 2, 1
        console.log(triangleIndices);        
        for (let i = 0; i < triangleIndices.length; i++) {
            trianglePoints.push(polygonPaths[triangleIndices[i]]);
        }      
        return trianglePoints;
    }  

    public createTriangleOptions(paths: any,) {
        let PolygonOptions: any = {
            paths: paths,
            strokeColor: '#000000',
            strokeOpacity: 0.33,
            strokeWeight: 0.5,
            fillOpacity: 0
        }  
        return PolygonOptions;
    }

    public createControlOptions(paths: any,) {
        let PolygonOptions: any = {
            paths: paths,
            strokeColor: '#00FF00',
            strokeOpacity: 1,
            strokeWeight: 5,
            fillOpacity: 3
        }  
        return PolygonOptions;
    }

    public testEarcut(data) {
        return earcut(data);
    }    

    /**
     * Calculates bearing between two geodetic points
     * @param point1
     * @param point2 
     */
    public calcBearing(point1, point2) {
        let p1Lat = this.getRadians(point1.lat),
        p1Lng = this.getRadians(point1.lng),
        p2Lat = this.getRadians(point2.lat),
        p2Lng = this.getRadians(point2.lng)

        let dLong = p2Lng - p1Lng;
        let dPhi = math.log(math.tan(p2Lat / 2.0 + math.pi / 4.0) / math.tan(p1Lat / 2.0 + math.pi / 4.0));

        if (math.abs(dLong) > math.pi) {
            if (dLong > 0.0) {
                dLong = -(2.0 * math.pi - dLong)
            } else {
                dLong = (2.0 * math.pi + dLong)
            }
        }

        let bearing = (this.getDegrees(math.atan2(dLong, dPhi)) + 360.0) % 360.0;
        //console.log("BEARING: " + bearing);
        return bearing;
    }

    /**
     * 
     * @param diff 
     * @param index 
     */
    public checkBearingDifference(diff) {
        if (Math.abs(diff) > 180) {
            diff = 360 - Math.abs(diff);
        } else {
             diff = Math.abs(diff);
        }
        //console.log("Bearing Difference: " + diff);
        if (diff > 10) {
            return true;                   
        }
        return false;
    }

    /**
     * Converts from Path String to LatLng Object
     * @param path 
     */
    public getLatLngFromString(path: String) {
        let latLngOrg = path.replace(/[()]/g, '');
        let latLng = latLngOrg.split(',');
         //console.log(latlang);
        return new google.maps.LatLng(parseFloat(latLng[0]) , parseFloat(latLng[1]));
    }


    public getLineIntersection(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) {
        if (this.equalPoints(p1x, p1y, p3x, p3y) || this.equalPoints(p1x, p1y, p4x, p4y) || this.equalPoints(p2x, p2y, p3x, p3y) || this.equalPoints(p2x, p2y, p4x, p4y)) {
            return false;
        } 

        let s1x, s1y, s2x, s2y;
        s1x = p2x - p1x;
        s1y = p2y - p1y;
        s2x = p4x - p3x;
        s2y = p4y - p3y;

        let s, t;
        s = (-s1y * (p1x - p3x) + s1x * (p1y - p3y)) / (-s2x * s1y + s1x * s2y);
        t = ( s2x * (p1y - p3y) - s2y * (p1x - p3x)) / (-s2x * s1y + s1x * s2y);

        if (s >= 0 && s <= 1 && t >= 0 && t <= 1) return true;
        return false; // No collision
    }

    public equalPoints(p1x, p1y, p2x, p2y) {
        return (p1x == p2x) && (p1y == p2y);
    }
}