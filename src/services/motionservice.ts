import { Injectable } from '@angular/core'; 
import { DeviceMotion, DeviceMotionAccelerationData } from '@ionic-native/device-motion';
import { DeviceOrientation, DeviceOrientationCompassHeading } from '@ionic-native/device-orientation';
import { Observable } from 'rxjs/Observable';

import * as math from 'mathjs'; // don't named as Math, this will conflict with Math in JS

@Injectable()
export class MotionService {  

    public subscriptionAcceleration;
    public subscriptionOrientation;
    public gravity: any[] = [];
    public linearAcceleration: any[] = [];
    public currentAVLP = 0;
    public previousAVLP = 0;
    public steps = 0;
    public status = 1;
    public mili = 0;
    
    // step detection test
    public motionStatus = 0;
    public x = 0;
    public y = 0;
    public z = 0;
    public accValueLowPass;
    //public steps = 0;
    public direction;
    public directionValues: any[] = [];
    public compassPts: any[] = [];
    public centroidPts: any[] = [];
    public polylineIndex = 6;   

    constructor(private deviceMotion: DeviceMotion, private deviceOrientation: DeviceOrientation) { 
        this.gravity = [0, 0, 0];
        this.linearAcceleration = [0, 0, 0];
        // setInterval(() => { this.ms(); }, 100);
    }

    getCurrentAcceleration() {
        // Get the device current acceleration
        this.deviceMotion.getCurrentAcceleration().then(
        (acceleration: DeviceMotionAccelerationData) => console.log(acceleration),
        (error: any) => console.log(error)
        );
    }

    startWatchingAcceleration() {
        this.steps = 0;
        // Watch device acceleration
        console.log("Start watching acceleration.");
        return Observable.create(observer => {
            this.subscriptionAcceleration = this.deviceMotion.watchAcceleration({frequency: 100}).subscribe((acceleration: DeviceMotionAccelerationData) => {
                //console.log(acceleration);
                observer.next(acceleration);
            });
        });
    }
    
    stopWatchingAcceleration() {
        // Stop watch
        console.log("Stop watching acceleration.");
        this.subscriptionAcceleration.unsubscribe();
    }

    getCurrentOrientation() {
        this.deviceOrientation.getCurrentHeading().then(
            (data: DeviceOrientationCompassHeading) => console.log(data),
            (error: any) => console.log(error)
        );
    }

    startWatchingOrientation() {
        console.log("Start watching orientation.");
        return Observable.create(observer => {
            this.subscriptionOrientation = this.deviceOrientation.watchHeading().subscribe((orientation: DeviceOrientationCompassHeading) => {
                //console.log(orientation);
                observer.next(orientation);
            });
        });
    }

    stopWatchingOrientation() {
        console.log("Stop watching orientation.")
        this.subscriptionOrientation.unsubscribe();
    }

    acceleration(x, y, z) {
        let accValue = Math.sqrt((Math.pow(x, 2), Math.pow(y, 2), Math.pow(z, 2)));
        return accValue;
    }

    // from android site, Low Pass Filter
    accelerationLowPass(x, y, z) {
        let alpha = 0.8;

        this.gravity[0] = alpha * this.gravity[0] + (1 - alpha) * x;
        this.gravity[1] = alpha * this.gravity[1] + (1 - alpha) * y;
        this.gravity[2] = alpha * this.gravity[2] + (1 - alpha) * z;

        this.linearAcceleration[0] = x - this.gravity[0];
        this.linearAcceleration[1] = y - this.gravity[1];
        this.linearAcceleration[2] = z - this.gravity[2];

        let accValue = Math.sqrt((Math.pow(this.linearAcceleration[0], 2),
                                    Math.pow(this.linearAcceleration[1], 2),
                                    Math.pow(this.linearAcceleration[2], 2)));
        //console.log(accValue);
        return accValue;
    }

    stepDetection(accValue) {        
        // fetch current acceleration value
        this.currentAVLP = accValue;

        // threshold, count steps if acceleration is higher than before
        if (this.status === 1) {
            if (Math.abs(this.currentAVLP - this.previousAVLP) > 2.3) {
                // console.log("CURRENT: " + this.currentAVLP);
                this.steps++;
                // console.log("STEPS: " + this.steps);
                this.status = 0;
                // console.log("STATUS: " + this.status);
                // setTimeout after step is detected
                setTimeout(() => { this.changeStatus(); }, 400);
            }
        }
        return this.steps;
    }      

    changeStatus() {
        this.status = 1;
        // console.log("STATUS: " + this.status);
    }

    getMedian(values) {
        return math.median(values);
    }


    // ################ //
    // #### MOTION #### //
    // ################ //
    // google maps test

    /* public routingMotion() {
        this.toggleMapView();
        console.log("Start motion routing.");
        let startPosition;
        this.mapService.getCurrentPositionGPS().subscribe(data => {
            startPosition = data;
            console.log("Start Position: " + startPosition.lat + ", " + startPosition.lng);
            this.startRoutingMotion(startPosition);
        });    
    }

    public startRoutingMotion(startPosition) {
        if (this.infoViewState == 'in') this.toggleInfoView();
        this.compassPts = [];
        this.currentPosition = startPosition.lat + ", " + startPosition.lng;
        this.compassPts.push(this.currentPosition);

        if (this.motionStatus === 0) {
            this.motionStatus = 1;
            this.motionService.startWatchingAcceleration().subscribe(data => {    
                this.x = data.x;
                this.y = data.y;
                this.z = data.z;
                this.accValueLowPass = this.motionService.accelerationLowPass(this.x, this.y, this.z);      
                let prevSteps = this.steps;     
                this.steps = this.motionService.stepDetection(this.accValueLowPass);  
                if (prevSteps < this.steps) {
                    this.currentPosition = this.mapService.getCurrentPositionCompass(this.currentPosition, 0.63, this.direction);
                    let currentPt = this.currentPosition.split(", ");
                    this.centroidPts.push({lat: currentPt[0], lng: currentPt[1]});
                    console.log("STEPS: " + this.steps);
                    // add centroid point of last 5 measured points to polyline, reset array
                    if (this.polylineIndex > 5) {
                        let centroidPt = this.mapService.getPolygonCentroid(this.centroidPts);
                        this.compassPts.push(this.currentPosition);
                        this.polylineIndex = 0;
                        this.centroidPts = [];
                    }
                    console.log("CompassPts Length: " + this.compassPts.length);
                    this.paintRoute(this.compassPts);
                    this.polylineIndex++;
                }
            });
        } else {
            this.motionService.stopWatchingAcceleration();
            this.motionStatus = 0;
        }
    }

    public paintRoute(points: any) {
        if (this.polygon != null) {
            this.polygon.setMap(null);
        }  
        if (this.mapViewState == 'on') {
            this.toggleMapView();
        }
        let latLngPts = this.mapService.splitCoordinatesToLatLng(points);
        this.polygon = new google.maps.Polyline();
        this.polygon.setOptions(this.mapService.createPolylineOptions(latLngPts));
        this.polygon.setMap(this.map);
        let center = new google.maps.LatLng(latLngPts[latLngPts.length-1].lat, latLngPts[latLngPts.length-1].lng);
        this.map.panTo(center);

        let lengthInMeters = google.maps.geometry.spherical.computeLength(this.polygon.getPath());
        console.log("Polyline length: " + lengthInMeters);
    }  */

    /**
     * Calculates new position from measured compass azimuth and step length
     * http://cosinekitty.com/compass.html
     * @param currentPosition 
     * @param direction 
     */
    /* getCurrentPositionCompass(currentPosition, dist, direction) {  
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
    }  */
}