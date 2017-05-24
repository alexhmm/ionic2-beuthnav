import { Injectable } from '@angular/core'; 
import { DeviceMotion, DeviceMotionAccelerationData } from '@ionic-native/device-motion';
import { DeviceOrientation, DeviceOrientationCompassHeading } from '@ionic-native/device-orientation';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class MotionService {  

    public subscriptionAcceleration;
    public subscriptionOrientation;

    constructor(private deviceMotion: DeviceMotion, private deviceOrientation: DeviceOrientation) { 

    }

    getCurrentAcceleration() {
        // Get the device current acceleration
        this.deviceMotion.getCurrentAcceleration().then(
        (acceleration: DeviceMotionAccelerationData) => console.log(acceleration),
        (error: any) => console.log(error)
        );
    }

    startWatchingAcceleration() {
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

}