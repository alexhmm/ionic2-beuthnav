import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';

import { BeaconService } from '../../services/beaconservice';
import { TriService } from '../../services/triservice';

import * as beacondata from '../../assets/data/beacondata.json';

@Component({
  selector: 'page-beacon',
  templateUrl: 'beacon.html',
})
export class BeaconPage {

    public beacons: any[] = [];
    public rssis: any[] = [];

    constructor(public beaconService: BeaconService, public triService: TriService) {
        
    }

    ionViewDidLoad() {
        console.log('ionViewDidLoad IBeacon');    
        this.beaconService.setupBeacons();
        //this.beaconService.startRangingBeacons();  
    }    

    startRangingBeacon() {
        this.beaconService.startRangingBeacon();  
    } 

    startRangingBeacons() {
        this.beaconService.startRangingBeacons();  
    }

    stopRangingBeacons() {
        this.beaconService.stopRangingBeacons(); 
        this.beacons = this.beaconService.getBeacons();
    }

    calcKalman() {
        console.log("calcKalman()");
        this.beaconService.calcKalmanTest();
        //this.rssis = this.beaconService.getRssis();
    }

    calcTri() {
        let beacons: any[] = [];
        beacons.push({lat: 52.543938, lng: 13.352514, distance: 37.88, height: 37});
        beacons.push({lat: 52.543799, lng: 13.351237, distance: 51.85, height: 36});
        beacons.push({lat: 52.543671, lng: 13.351655, distance: 26.69, height: 36});
        //this.triService.trilaterate(beacons);
        this.triService.trilaterate2(beacons);
    }
}
