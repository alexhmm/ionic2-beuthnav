import { Injectable } from '@angular/core'; 
import { IBeacon } from '@ionic-native/ibeacon';
import { KalmanService } from './kalmanservice';

import * as beacondata from '../assets/data/beacondata.json';

@Injectable()
export class BeaconService {  

    public beacons: any[] = [];
    public beacondataStr: any[] = [];
    public rssis: any[] = [];
    public currentRSSI;
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

                    let kalmanFilter = new KalmanService();
                    //let kalmanRSSI = kalmanFilter.filter(beacon[0].rssi, 2, 5, 1, 0, 1);

                    // own accuracy calc -- still testing
                    let accuracyCalc = (Math.pow(10, (beacon[0].tx - beacon[0].rssi) / (10 * 3.5))).toFixed(2);

                    // kalman filtering
                    if (this.rssis.length < 10) {
                        this.rssis.push(beacon[0].rssi);
                    } else {
                        this.rssis.splice(0, 1);
                        this.rssis.push(beacon[0].rssi);
                    }

                    if (this.rssis.length > 0) {
                        let kalman = new KalmanService();
                        var dataConstantKalman = this.rssis.map(function(v) {
                            return kalman.filter(v, 2, 5, 1, 0, 1);
                        });
                        let index = dataConstantKalman.length - 1;
                        //console.log("Constant Kalman[length]: " + dataConstantKalman.length + ", " + dataConstantKalman[index]);
                        this.currentRSSI = dataConstantKalman[index].toFixed(2);
                    }

                    let accuracyCalcKalman = (Math.pow(10, (beacon[0].tx - this.currentRSSI) / (10 * 3.5))).toFixed(2);

                    console.log("Id: " + region.identifier
                     + ", Acc: " + beacon[0].accuracy
                     + ", AccuC: " + accuracyCalc
                     + ", AccuCK: " + accuracyCalcKalman
                     + ", TX: " + beacon[0].tx
                     + ", RSSI: " + beacon[0].rssi
                     + ", RSSI-K: " + this.currentRSSI
                     + ", Prox: " + beacon[0].proximity);     
                    this.beacons.push({identifier: region.identifier,
                         tx: beacon[0].tx,
                         rssi: beacon[0].rssi,
                         rssiK: this.currentRSSI,
                         acc: beacon[0].accuracy,
                         accC: accuracyCalc,
                         accCK: accuracyCalcKalman,
                         coordinates: this.beacondataStr[indexData].coordinates});
                } else {
                    //console.log("Region Identifier: " + region.identifier + ", No signal received.")
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

    calcKalmanTest() {
        let rssis: any[] = [];
        let values = "0,-75;1,-73;2,-77;3,-73;4,-73;5,-75;6,-77;7,-74;8,-74;9,-76;10,-77;11,-76;12,-76;13,-76;14,-78;15,-76;16,-81;17,-79;18,-78;19,-79;0,-83;1,-85;2,-90;3,-84;4,-93;5,-77;6,-86;7,-78;8,-78;9,-82;10,-82;11,-84;12,-79;13,-78;14,-86;15,-84;16,-78;17,-86;18,-77;19,-78"
        let splitted: any[] = values.split(";");
        for (let x in splitted) {            
            let value: any[] = splitted[x].split(",")
            rssis.push(value[1]);
            console.log("Value: " + value[1]);
        }
        let kalman = new KalmanService();

        console.log("Single Kalman: " + kalman.filter(rssis[1], 2, 5, 1, 0, 1));        

        var dataConstantKalman = rssis.map(function(v) {
            return kalman.filter(v, 2, 5, 1, 0, 1);
        });
        for (let x in dataConstantKalman) {
            console.log("Data:" + splitted[x] + ", " + dataConstantKalman[x]);
        }
    }
}