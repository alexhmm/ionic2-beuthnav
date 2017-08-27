import { Component } from '@angular/core';
import { NavController, NavParams, Platform } from 'ionic-angular';

import { MotionService } from '../../services/motionservice';
import { FileService } from '../../services/fileservice';
import { KalmanService } from '../../services/kalmanservice';

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
    public directionK;
    public accValue;
    public accValueLowPass;
    public accValueLowPassTime;
    public steps = 0;
    public currentPosition = "52.502098, 13.492520";
    public stateCompass = 'off';
    public index = 0;
    public dataX;
    public dataCompassY;
    public dataCompassZ;    
    public inputText;

    public directions: any[] = [];

    constructor(public platform: Platform, public fileService: FileService, public motion: MotionService) {

    }  

    ionViewDidLoad() {
        this.platform.ready().then(() => {
            this.motion.getCurrentAcceleration();
            this.motion.getCurrentOrientation();

            if ((<any>window).DeviceOrientationEvent) {
                console.log("DeviceOrientationevent available");
                window.addEventListener('deviceorientation', (eventData) => {
                    var dir = eventData.alpha; // eventData.alpha.toFixed(2);
                    //deviceOrientationHandler(dir);
                    this.direction = 360 - dir; //360 - Math.ceil(dir);
                    //console.log("Dir: " + this.direction);
                }, false);
            } else {
                console.log("No DeviceOrientationEvent available");
            };
            setInterval(() => { 
                this.saveOrientation();
           }, 1000);    

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

    public saveOrientation() {
        if (this.directions.length < 10) {
            this.directions.push(this.direction);
        } else {
            this.directions.splice(0, 1);
            this.directions.push(this.direction);
        }
        if (this.directions.length > 0) {
            let kalman = new KalmanService();
            let dataConstantKalman = this.directions.map(function(v) {
                return kalman.filter(v, 2, 5, 1, 0, 1);
            });
            let index = dataConstantKalman.length - 1;
            //console.log("Constant Kalman[length]: " + dataConstantKalman.length + ", " + dataConstantKalman[index]);
            this.directionK = dataConstantKalman[index].toFixed(2);
        }
        if (this.stateCompass == 'on') this.logCompassData();    
    }

    public toggleCompass() {        
        if (this.stateCompass == 'off') {
            this.stateCompass = 'on';
            this.index = 0;
            this.dataX = "x: [";
            this.dataCompassY = "y-R: [";
            this.dataCompassZ = "z-RK: ["
        } else {
            this.stateCompass = 'off';
            console.log("THIS.STATESINGLE = " + this.stateCompass);
            let data = this.dataX + "] \n" + this.dataCompassY + "] \n" + this.dataCompassZ + "] \n";
            console.log(data); 
            this.index = 0;
            this.fileService.createFile(this.inputText, data);
        }            
    }

    public logCompassData() {
        this.dataX += this.index + ", "
        this.dataCompassY += this.direction + "; "
        this.dataCompassZ += this.directionK + "; "
        console.log("dataX: " + this.dataX);
        console.log("dataSingleX: " + this.dataCompassY);
        console.log("dataSingleZ: " + this.dataCompassZ);
        this.index++;
    }
}