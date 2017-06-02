import { Injectable } from '@angular/core'; 
import { Geolocation } from '@ionic-native/geolocation';

import * as math from 'mathjs'; // don't named as Math, this will conflict with Math in JS

import * as beuthdata from '../assets/data/beuthdata.json';

enum Roomcolor {
    lab = <any>"#FF0000",
    lecture = <any>"#00FF00",
    wc = <any>"#00FFFF"
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

    constructor() {
        this.wgs84f = math.divide(math.subtract(this.wgs84a, this.wgs84b), this.wgs84a); 
        this.wgs84a2 = math.multiply(this.wgs84a, this.wgs84a);
        this.wgs84b2 = math.multiply(this.wgs84b, this.wgs84b);
        this.wgs84e = math.sqrt(math.divide(math.subtract(this.wgs84a2, this.wgs84b2), this.wgs84a2));
        this.wgs84e2 = math.pow(this.wgs84e, 2);
        this.wgs84ep = math.sqrt(math.divide(math.subtract(this.wgs84a2, this.wgs84b2), this.wgs84b2));
    } 

    getAllRooms() {
        let allrooms: any[] = [];

        for (let i = 0; i < beuthdata.d00.length; i++) {
            let name = beuthdata.d00[i].name;
            let desc = beuthdata.d00[i].desc;
            console.log("BEUTHDATA NAME: " + name + ", DESC: " + desc);
            allrooms.push({name: name, desc: desc});
        }
        return allrooms;
    }

    createRoomPolygonOptions(paths: any, type: any) {
        let roomPolygonOptions: any = {
            paths: paths,
            strokeColor: '#000000',
            strokeOpacity: 0.5,
            strokeWeight: 1,
            fillColor: Roomcolor[type],
            fillOpacity: 0.5
        }  
        return roomPolygonOptions;
    }

    createCircleOptions(position: any) {
        let circleOptions: any = {
            center: {lat: position.coords.latitude, lng: position.coords.longitude},
            strokeWeight: 0,
            fillColor: '#0000FF',
            radius: 3
        }
        return circleOptions;
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

    /**
     * Calculates new position from measured compass azimuth and step length
     * @param currentPosition 
     * @param direction 
     */
    getCurrentCompassPosition(currentPosition, dist, direction) {  
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
        console.log("ECEF POINT: " + ePoint);
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
            let ePoint = this.LLAtoECEF(points[x].lat, points[x].lng, points[x].height);
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
        console.log(triLatLng);
    }     
}