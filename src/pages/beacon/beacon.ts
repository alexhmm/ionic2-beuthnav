import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';

import { BeaconService } from '../../services/beaconservice';
import { MapService } from '../../services/mapservice';

import * as beacondata from '../../assets/data/beacondata.json';

@Component({
  selector: 'page-beacon',
  templateUrl: 'beacon.html',
})
export class BeaconPage {

    public beacons: any[] = [];
    public rssis: any[] = [];
    public tricons: any[] = [];

    constructor(public beaconService: BeaconService, public mapService: MapService) {
        
    }

    ionViewDidLoad() {
        console.log('ionViewDidLoad IBeacon');    
        this.beaconService.setupBeacons();
        //this.beaconService.startRangingBeacons(); 
        setInterval(() => { this.checkBeacons(); }, 3000);
    }    

    checkBeacons() {
        console.log("CHECK BEACONS");
        try {
            this.tricons = this.beaconService.getBeacons();
            for (let beacon in this.tricons) {
                console.log(this.tricons[beacon]);
            }
            //this.beaconService.getBeaconsC();
        } catch(e) {
            console.log(e);
        }
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
        beacons.push({lat: 52.543938, lng: 13.352514, distance: 38.16, height: 37});
        beacons.push({lat: 52.543799, lng: 13.351237, distance: 51.96, height: 36});
        beacons.push({lat: 52.543671, lng: 13.351655, distance: 26.99, height: 36});
        let triPt = this.mapService.trilaterate(beacons);
    }
}
