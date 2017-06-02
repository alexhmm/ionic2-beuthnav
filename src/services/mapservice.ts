import { Injectable } from '@angular/core'; 
import { Geolocation } from '@ionic-native/geolocation';

import * as beuthdata from '../assets/data/beuthdata.json';

enum Roomcolor {
    lab = <any>"#FF0000",
    lecture = <any>"#00FF00",
    wc = <any>"#00FFFF"
}

@Injectable()
export class MapService {  

    public triPoints: any[] = [];

    constructor() {

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
     * 
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

    splitCoordinates() {

    }

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

    calcEarthR(latitudeRadians) {
        // http://en.wikipedia.org/wiki/Earth_radius
        var a = 6378137;
        var b = 6356752.3142;
        var cos = Math.cos(latitudeRadians);
        var sin = Math.sin(latitudeRadians);
        let t1 = Math.pow((Math.pow(a, 2) * cos), 2) + Math.pow((Math.pow(b, 2) * sin), 2);
        let t2 = Math.pow((a * cos), 2) + Math.pow((b * sin), 2);
        let earthR = Math.sqrt(t1 / t2);
        console.log("ER: " + earthR);
        return earthR;
    }

    calcCurrentCompassPosition(currentPosition, direction) {  
        let split = currentPosition.split(",");
        let lat = parseFloat(split[0]);
        let lng = parseFloat(split[1]);
        let distance = 10;
        let azimuth = direction;

        console.log("OLD - LAT: " + lat + ", " + lng);
        console.log("AZIMUTH: " + direction);

        let radians = Math.PI / 180.0;
        let degrees = 180.0 / Math.PI;
        var latRadians = radians * lat;
        var azRadians = radians * azimuth;
        var earthRad = this.calcEarthR(latRadians);
        var cosLat = Math.cos(latRadians);
        var cosAz = Math.cos(azRadians);
        var sinAz = Math.sin(azRadians);
        var ratio = distance / earthRad;
        var targetLat = lat + (degrees * cosAz * ratio);
        var targetLon = lng + (degrees * (sinAz / cosLat) * ratio);
        console.log("NEW - LAT: " + targetLat + ", " + targetLon);
        return targetLat + ", " + targetLon;
    } 
}