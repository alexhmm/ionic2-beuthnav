import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { IBeacon } from '@ionic-native/ibeacon';

import * as beacondata from '../../assets/data/beacondata.json';

@Component({
  selector: 'page-beacon',
  templateUrl: 'beacon.html',
})
export class BeaconPage {

    public beacons: any[] = [];
    public beacondataStr: any[] = [];

    public currentPositionBeacon: any;

  constructor(public ibeacon: IBeacon) {
      for (let i = 0; i < beacondata.beacons.length; i++) {
          this.beacondataStr.push({identifier: beacondata.beacons[i].identifier, coordinates: beacondata.beacons[i].coordinates});
      }
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad IBeacon');

    for (let i = 0; i < beacondata.beacons.length; i++) {
        console.log(beacondata.beacons[i].identifier);
    }
    
    this.setupBeacons();
    this.startRangingBeacons();  
    } 

    setupBeacons() {
        this.ibeacon.requestAlwaysAuthorization();

        // create a new delegate and register it with the native layer
        let delegate = this.ibeacon.Delegate();

        

        // Subscribe to some of the delegate's event handlers
        delegate.didDetermineStateForRegion().
        subscribe(
            data => console.log('didDetermineStateForRegion: ', data),
            error => console.error()
        );
        delegate.didStartMonitoringForRegion().subscribe(
            data => console.log('didStartMonitoringForRegion: ', data),
            error => console.error()
        );
        delegate.didRangeBeaconsInRegion()
        .subscribe(
            data => {
                //console.log('didRangeBeaconsInRegion: ', JSON.stringify(data));
                //pos = myArray.map(function(e) { return e.hello; }).indexOf('stevie');

                let region = data.region;
                let beacon = data.beacons;
                
                try {
                    let index = this.beacons.map(function(e) { return e.identifier; }).indexOf(region.identifier);
                    if (index != -1) {                    
                      console.log("Index of " + region.identifier + ": " + index);
                      this.beacons.splice(index, 1);
                    }
                } catch(e) {
                    console.log("INDEX ERROR: " + e);
                }
                
                if (typeof beacon[0] !== 'undefined') {
                    // get coordinates of identified beacon
                    let indexData;
                    try {
                        indexData = this.beacondataStr.map(function(e) { return e.identifier; }).indexOf(region.identifier);
                    } catch(e) {
                        console.log("INDEX DATA ERROR: " + e);
                    }
                    console.log("Region Identfier: " + region.identifier
                     + ", Accuracy: " + beacon[0].accuracy
                     + ", TX: " + beacon[0].tx
                     + ", RSSI: " + beacon[0].rssi
                     + ", Proximity: " + beacon[0].proximity);
                    this.beacons.push({identifier: region.identifier, accuracy: beacon[0].accuracy, coordinates: this.beacondataStr[indexData].coordinates});
                    console.log(this.beacons);
                    //this.calculateCurrentPositionBeacon(this.beacons);
                }
            },
            error => console.error()
        );

        this.ibeacon.setDelegate(delegate);
        //return delegate;
        // let beaconRegion = this.ibeacon.BeaconRegion('QIsB','f7826da6-4fa2-4e98-8024-bc5b71e0893e', 14191, 1594);
        // let beaconRegion2 = this.ibeacon.BeaconRegion('PWC8','f7826da6-4fa2-4e98-8024-bc5b71e0893e', 31092, 61454);
    }

    startRangingBeacons() {
        console.log("Started ranging beacons.");
        for (let i = 0; i < beacondata.beacons.length; i++) {
            let beaconRegion = this.ibeacon.BeaconRegion(
              beacondata.beacons[i].identifier,
              beacondata.beacons[i].uuid,              
              beacondata.beacons[i].major,
              beacondata.beacons[i].minor);
            this.ibeacon.startRangingBeaconsInRegion(beaconRegion)
            .then(
                () => console.log('Native layer recieved the request to monitoring'),
                error => console.error('Native layer failed to begin monitoring: ', error)
            );
        }
    }

    stopRangingBeacons() {
        console.log("Stopped ranging beacons.");
        for (let i = 0; i < beacondata.beacons.length; i++) {
            let beaconRegion = this.ibeacon.BeaconRegion(
              beacondata.beacons[i].identifier,
              beacondata.beacons[i].uuid,
              beacondata.beacons[i].major,
              beacondata.beacons[i].minor);
            this.ibeacon.stopRangingBeaconsInRegion(beaconRegion)
            .then(
                () => console.log('Native layer recieved the request to monitoring'),
                error => console.error('Native layer failed to begin monitoring: ', error)
            );
        }
    }

    calculateCurrentPositionBeacon(points: any[]) {
        
        let centroidPoints: any[] = [];
        let relationPoints: any[] = [];

        for (let x in points) {
            let coordinatesSplit: any[] = points[x].coordinates.split(", ");
            let lat = coordinatesSplit[0];
            let lng = coordinatesSplit[1];
            lat = lat / points[x].accuracy;
            lng = lng / points[x].accuracy;
            relationPoints.push({lat: lat, lng: lng})
        }

        // relation accuracy
        for (let x in points) {

        }

        let centroid: any = {lat: 0, lng: 0};
        for (let x in points) {
            centroid.lat += points[x].lat;
            centroid.lng += points[x].lng;
        }
        centroid.lat = centroid.lat / points.length;
        centroid.lng = centroid.lng / points.length;
         return centroid;
    
    }

}
