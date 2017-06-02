import { Component } from '@angular/core';
import { NavController, NavParams, Platform } from 'ionic-angular';

import { MapService } from '../../services/mapservice';
import { MotionService } from '../../services/motionservice';

@Component({
  selector: 'page-motion',
  templateUrl: 'motion.html'
})
export class MotionPage {  

    public x = 0;
    public y = 0;
    public z = 0;
    public magnDegree = 0;
    public trueDegree = 0;
    public accDegree = 0;
    public direction;
    public accValue;
    public accValueLowPass;
    public accValueLowPassTime;
    public steps = 0;
    public currentPosition = "52.502098, 13.492520";

    constructor(public platform: Platform, public mapService: MapService, public motion: MotionService) {

    }  

    ionViewDidLoad() {
        this.platform.ready().then(() => {
            this.motion.getCurrentAcceleration();
            this.motion.getCurrentOrientation();

            if ((<any>window).DeviceOrientationEvent) {
                console.log("DeviceOrientationevent available");
                window.addEventListener('deviceorientation', (eventData) => {
                    var dir = eventData.alpha
                    //deviceOrientationHandler(dir);
                    this.direction = Math.ceil(dir);
                    //console.log("Dir: " + this.direction);
                }, false);
            } else {
                console.log("No DeviceOrientationEvent available");
            };
        });
    }    

    startWatching() {
        this.motion.startWatchingAcceleration().subscribe(data => {            
            this.x = data.x;
            this.y = data.y;
            this.z = data.z;
            this.accValue = this.motion.acceleration(this.x, this.y, this.z);
            this.accValueLowPass = this.motion.accelerationLowPass(this.x, this.y, this.z);      

            let prevSteps = this.steps;     
            this.steps = this.motion.stepDetection(this.accValueLowPass);  
            if (prevSteps < this.steps) {
                this.currentPosition = this.mapService.getCurrentCompassPosition(this.currentPosition, 0.63, this.direction);
            }
        });
        /*this.motion.startWatchingOrientation().subscribe(data => {
            this.magnDegree = data.magneticHeading;
            this.trueDegree = data.trueHeading;
            this.accDegree = data.headingAccuracy;
        });*/
    }

    stopWatching() {
        this.motion.stopWatchingAcceleration();
        //this.motion.stopWatchingOrientation();
    }

    updatePage(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

}