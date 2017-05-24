import { Component } from '@angular/core';
import { NavController, NavParams, Platform } from 'ionic-angular';

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

    constructor(public platform: Platform, public motion: MotionService) {

    }  

    ionViewDidLoad() {
        this.platform.ready().then(() => {
            this.motion.getCurrentAcceleration();
            this.motion.getCurrentOrientation();
        });
    }

    startWatching() {
        this.motion.startWatchingAcceleration().subscribe(data => {
            this.x = data.x;
            this.y = data.y;
            this.z = data.z;
        });
        this.motion.startWatchingOrientation().subscribe(data => {
            this.magnDegree = data.magneticHeading;
            this.trueDegree = data.trueHeading;
            this.accDegree = data.headingAccuracy;
        });
    }

    stopWatching() {
        this.motion.stopWatchingAcceleration();
        this.motion.stopWatchingOrientation();
    }

    updatePage(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

}