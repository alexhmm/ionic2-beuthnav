import { Injectable } from '@angular/core'; 

import * as math from 'mathjs'; // don't named as Math, this will conflict with Math in JS

@Injectable()
export class TriService {  

    public triPoints: any[] = [];

    public wgs84a = 6378137;           // WGS-84 Earth semimajor axis (m)
    public wgs84b = 6356752.3142;      // WGS-84 Earth semiminor axis (m)
    public wgs84f;
    public wgs84a2;
    public wgs84b2;
    public wgs84e;
    public wgs84e2;

    constructor() {
        this.wgs84f = math.divide(math.subtract(this.wgs84a, this.wgs84b), this.wgs84a); 
        this.wgs84a2 = math.multiply(this.wgs84a, this.wgs84a);
        this.wgs84b2 = math.multiply(this.wgs84b, this.wgs84b);
        this.wgs84e = math.sqrt(math.divide(math.subtract(this.wgs84a2, this.wgs84b2), this.wgs84a2));
        //let e = f * (2 - f);    // Square of Eccentricity
        // let e = math.sqrt((a2-b2)/a2);
        this.wgs84e2 = 1 - (math.divide(math.pow(this.wgs84b, 2), math.pow(this.wgs84a, 2)));
    }

    getN(latitude) {
        let sinLat = math.sin(latitude);
        let denom = math.sqrt(1 - this.wgs84e * this.wgs84e * sinLat * sinLat);
        let N = this.wgs84a / denom;
        console.log("GET N: " + N);

        return N;
    }

    getRadians(degrees) {
        return degrees * (math.pi / 180);
    }

    getDegrees(radians) {
        return radians * (180 / math.pi);
    }

    LLAtoECEF(latitude, longitude, altitude) {
        console.log("# LLAtoECEF #");
        let lat = this.getRadians(latitude);
        let lng = this.getRadians(longitude);

        console.log("Radians LAT, LNG: " + lat + ", " + lng);

        let latSin = math.sin(lat);
        let latCos = math.cos(lat)
        let lngSin = math.sin(lng);
        let lngCos = math.cos(lng);

        let N = this.wgs84a / math.sqrt(1 - this.wgs84e2 * latSin * latSin);
        console.log("N: " + N);
        let NN = this.getN(latitude);
        console.log("NN: " + NN);

        console.log("Beacon Lat: " + latitude + ", Lng: " + longitude);

        let ePoint = [(altitude + N) * latCos * lngCos,
                        (altitude + N) * latCos * lngSin,
                        (altitude + (1 - this.wgs84e2) * N) * latSin];
        console.log("ePoint: " + ePoint);
        return ePoint;
    }

    ECEFtoLLA(x, y, z) {
        console.log ("ECEFtoLLA");

        //Auxiliary values first
        let p = math.sqrt(x * x + y * y);
        let theta = math.atan(math.divide(math.multiply(z, this.wgs84a), math.multiply(p, this.wgs84b)));

        let sinTheta = math.sin(theta);
        let cosTheta = math.cos(theta);

        let num = z + this.wgs84e2 * this.wgs84e2 * this.wgs84b * sinTheta * sinTheta * sinTheta;
        let denom = p - this.wgs84e * this.wgs84e * this.wgs84a * cosTheta * cosTheta * cosTheta;

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

        console.log("LATLNG, H: " + latitude, longitude, altitude);

        return latlng;
    }

    trilaterate2(beacons: any[]) {
        console.log("# TRI 2 #");  

        let ePoints: any[] = [];

        // transform LLA points to ECEF points
        for (let x in beacons) {
            let ePoint = this.LLAtoECEF(beacons[x].lat, beacons[x].lng, beacons[x].height);
            ePoints.push(ePoint);
        }

        /*#from wikipedia
        #transform to get circle 1 at origin
        #transform to get circle 2 on x axis*/
        let ex = math.divide(math.subtract(ePoints[1], ePoints[0]), math.norm(math.subtract(ePoints[1], ePoints[0])));
        console.log("EX: " + ex);
        let i = math.dot(ex, math.subtract(ePoints[2], ePoints[0]));
        console.log("I: " + i);
        let ey = math.divide(
                    math.subtract(math.subtract(ePoints[2], ePoints[0]), math.multiply(i, ex)),
                    math.norm(math.subtract(math.subtract(ePoints[2], ePoints[0]), math.multiply(i, ex))));
        console.log("EY: " + ey);
        let ez = math.cross(ex, ey);
        console.log("EZ: " + ez);
        let d = math.norm(math.subtract(ePoints[1], ePoints[0]));
        console.log("D: " + d);
        let j = math.dot(ey, math.subtract(ePoints[2], ePoints[0]));
        console.log("J: " + j);        

        /*#from wikipedia
        #plug and chug using above values*/
        let x = (math.pow(beacons[0].distance, 2) - math.pow(beacons[1].distance, 2) + math.pow(d, 2)) / (2 * d);
        console.log("X: " + x);
        let y = ((math.pow(beacons[0].distance, 2) - math.pow(beacons[2].distance, 2) + math.pow(i, 2) + math.pow(j, 2)) / (2 * j))
                - ((i / j) * x);        
        console.log("Y: " + y);

        // only one case shown here
        let z = math.sqrt(math.abs((math.pow(beacons[0].distance, 2) - math.pow(x, 2) - math.pow(y, 2))));
        console.log("Z: " + z);       

        let triPt = math.add(math.add(math.add(ePoints[0], math.multiply(x, ex)), math.multiply(y, ey)), math.multiply(z, ez));
        
        console.log("triPt: ");
        console.log(triPt);

        let triLatLng = this.ECEFtoLLA(triPt[0], triPt[1], triPt[2]);
        console.log(triLatLng);
    }        

}