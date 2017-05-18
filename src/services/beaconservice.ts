import { Injectable } from '@angular/core'; 
import { NavController, NavParams } from 'ionic-angular';
import { IBeacon } from '@ionic-native/ibeacon';

import * as beacondata from '../assets/data/beacondata.json';

@Injectable()
export class BeaconService {  

    public beacons: any[] = [];
    public beacondataStr: any[] = [];
    public currentPositionBeacon: any;

    constructor(private iBeacon: IBeacon) {
        for (let i = 0; i < beacondata.beacons.length; i++) {
          this.beacondataStr.push({identifier: beacondata.beacons[i].identifier, coordinates: beacondata.beacons[i].coordinates});
          console.log(beacondata.beacons[i].identifier);
      }      
    } 

    setupBeacons() {
        this.iBeacon.requestAlwaysAuthorization();

        // create a new delegate and register it with the native layer
        let delegate = this.iBeacon.Delegate();        

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
                let region = data.region;
                let beacon = data.beacons;  
                
                if (typeof beacon[0] !== 'undefined') {
                    try {
                        let index = this.beacons.map(function(e) { return e.identifier; }).indexOf(region.identifier);
                        if (index != -1) {    
                        this.beacons.splice(index, 1);
                        }
                    } catch(e) {
                        console.log("Index Error:: " + e);
                    }

                    // get coordinates of identified beacon
                    let indexData;
                    try {
                        indexData = this.beacondataStr.map(function(e) { return e.identifier; }).indexOf(region.identifier);
                    } catch(e) {
                        console.log("Index Error: " + e);
                    }

                    // own accuracy calc -- still testing
                    let accuracyCalc = Math.pow(10, (beacon[0].tx - beacon[0].rssi) / (10 * 3.5));

                    console.log("Region Identifier: " + region.identifier
                     + ", Accuracy: " + beacon[0].accuracy
                     + ", AccuracyCalc: " + accuracyCalc
                     + ", TX: " + beacon[0].tx
                     + ", RSSI: " + beacon[0].rssi
                     + ", Proximity: " + beacon[0].proximity);     
                    this.beacons.push({identifier: region.identifier, accuracy: beacon[0].accuracy, accuracyCalc: accuracyCalc, rssi: beacon[0].rssi, coordinates: this.beacondataStr[indexData].coordinates});
                } else {
                    console.log("Region Identifier: " + region.identifier + ", No signal received.")
                }
            },
            error => console.error()
        );

        this.iBeacon.setDelegate(delegate);
    }

    startRangingBeacons() {
        console.log("Started ranging beacons.");
        for (let i = 0; i < beacondata.beacons.length; i++) {
            let beaconRegion = this.iBeacon.BeaconRegion(
              beacondata.beacons[i].identifier,
              beacondata.beacons[i].uuid,              
              beacondata.beacons[i].major,
              beacondata.beacons[i].minor);
            this.iBeacon.startRangingBeaconsInRegion(beaconRegion)
            .then(
                () => console.log('Native layer recieved the request to monitoring'),
                error => console.error('Native layer failed to begin monitoring: ', error)
            );
        }
    }

    startRangingBeacon() {
        console.log("Started ranging single beacon.");
        let beaconRegion = this.iBeacon.BeaconRegion(
              beacondata.beacons[0].identifier,
              beacondata.beacons[0].uuid,
              beacondata.beacons[0].major,
              beacondata.beacons[0].minor);

        this.iBeacon.startRangingBeaconsInRegion(beaconRegion)
        .then(
                () => console.log('Native layer recieved the request to monitoring'),
                error => console.error('Native layer failed to begin monitoring: ', error)
        );
    }

    stopRangingBeacons() {
        console.log("Stopped ranging beacons.");
        for (let i = 0; i < beacondata.beacons.length; i++) {
            let beaconRegion = this.iBeacon.BeaconRegion(
              beacondata.beacons[i].identifier,
              beacondata.beacons[i].uuid,
              beacondata.beacons[i].major,
              beacondata.beacons[i].minor);
            this.iBeacon.stopRangingBeaconsInRegion(beaconRegion)
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

    getBeacons() {
        return this.beacons;
    }
}