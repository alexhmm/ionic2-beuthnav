import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';

import { BeaconService } from '../../services/beaconservice';

import * as beacondata from '../../assets/data/beacondata.json';

@Component({
  selector: 'page-beacon',
  templateUrl: 'beacon.html',
})
export class BeaconPage {

  constructor(public beaconService: BeaconService) {
      
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad IBeacon');    
    this.beaconService.setupBeacons();
    this.beaconService.startRangingBeacons();  
  }     

  startRangingBeacons() {
      this.beaconService.startRangingBeacons();  
  }

  stopRangingBeacons() {
      this.beaconService.stopRangingBeacons();  
  }

}
