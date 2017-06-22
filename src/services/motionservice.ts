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
}