import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Geolocation } from '@ionic-native/geolocation';

import { BeaconService } from '../../services/beaconservice';
import { FileService } from '../../services/fileservice';
import { RoutingService } from '../../services/routingservice';
import { KalmanService } from '../../services/kalmanservice';

import * as beacondata from '../../assets/data/beacondata.json';

@Component({
  selector: 'page-beacon',
  templateUrl: 'beacon.html',
})
export class BeaconPage {

    public beacons: any[] = [];
    public tricons: any[] = [];
    public QIsB = {
        identifier: 0,
        tx: 0,
        rssi: 0,
        rssiK: 0,
        acc: 0,
        accCK: 0,
        coordinates: ""
    }
    
    public checkState = 'all';
    public inputText;
    public index = 0;
    public failureIndex = 0;

    public stateQIsB = 'off';
    public dataX;
    public dataQIsB_RSSI;
    public dataQIsB_RSSIK;
    public dataQIsB_AccK;

    public statePos = 'off';
    public posBeacons;
    public posGPS;
    public dataPosBeacons;
    public dataPosGPS;    
    public failure;


    constructor(private geolocation: Geolocation,
                public beaconService: BeaconService,
                public fileService: FileService,
                public routingService: RoutingService) {
        
    }

    ionViewDidLoad() {
        console.log('ionViewDidLoad IBeacon');    
        this.beaconService.setupBeacons();
        if (this.checkState == 'all') {
            this.beaconService.startRangingBeacons();
        }
        else {
            this.beaconService.startRangingBeacon();
        }
        //this.beaconService.startRangingBeacons(); 
        //setInterval(() => { this.checkBeacons(); }, 3000);
        setInterval(() => { 
            this.checkBeacons();            
            if (this.stateQIsB == 'on') {
                this.logBeaconDataQIsB();
            }
            if (this.statePos == 'on') {
                this.logPositionData();
            }
            let posBeacons = this.getCurrentPositionBeacons();
            this.posBeacons = posBeacons.lat + ", " + posBeacons.lng;
            //this.getCurrentPositionGPS();
        }, 950); 
        setInterval(() => { 
            console.log("Beacons: " + this.posBeacons);
            console.log("GPS: " + this.posGPS);
        }, 10000);        
    }    

    public checkBeacons() {
        try {            
            this.beacons = this.beaconService.getBeacons();
            for (let x in this.beacons) {
                if (this.beacons[x].identifier == "QIsB") {
                    this.QIsB = this.beacons[x]; 
                    break;
                }
            }
        } catch(e) {
            console.log("BEACON ERROR: " + e);
        }
    }

    public startRangingBeacon() {
        this.beaconService.startRangingBeacon();  
    } 

    public startRangingBeacons() {
        this.beaconService.startRangingBeacons();  
    }

    public stopRangingBeacons() {
        this.beaconService.stopRangingBeacons(); 
        this.beacons = this.beaconService.getBeacons();
    }

    public toggleQIsB() {        
        if (this.stateQIsB == 'off') {
            this.stateQIsB = 'on';
            this.index = 0;
            this.failureIndex = 0;
            this.dataX = "x: [";
            this.dataQIsB_RSSI = "RSSI: [";
            this.dataQIsB_RSSIK = "RSSI-K: [";
            this.dataQIsB_AccK = "Acc-K: [";            
            this.failure = "No signal: ";
            this.beaconService.resetRSSIS();
        } else {
            this.stateQIsB = 'off';
            let data = this.dataX + "] \n" + this.dataQIsB_RSSI + "] \n" + this.dataQIsB_RSSIK + "] \n"
                        + this.dataQIsB_AccK;
            console.log(data); 
            this.index = 0;
            this.failureIndex = 0;
            console.log("Data saved: " + this.inputText + "\n ##########################");
            this.fileService.createFile(this.inputText, data);
        }            
    }

    public logBeaconDataQIsB() {    
        try {    
            this.dataX += this.index + ", ";
            // let outOfRange = 0;
            this.dataQIsB_RSSI += this.QIsB.rssi + ", ";
            this.dataQIsB_RSSIK += this.QIsB.rssiK + ", ";
            this.dataQIsB_AccK += this.QIsB.accCK + ", ";
        } catch(e) {
            console.log("Out of range: " + e);
            this.dataX += this.index + ", ";
            this.QIsB = {
                identifier: 0,
                tx: 0,
                rssi: 0,
                rssiK: 0,
                acc: 0,
                accCK: 0,
                coordinates: ""
            }
            this.dataX += this.index + ", ";
            this.dataQIsB_RSSI += 0 + ", ";
            this.dataQIsB_RSSIK += 0 + ", ";
            this.dataQIsB_AccK += 0 + ", ";
            if (this.stateQIsB == 'on') {
                this.failure += this.index + ", ";   
                this.failureIndex++;
            }
        }
        this.index++;
    }

    public getCurrentPositionBeacons() {
        try {
            this.tricons = [];       
            for (let i = 0; i < 3; i++) {
                let latLngAlt = this.beacons[i].coordinates.split(", ");                
                this.tricons.push({lat: latLngAlt[0], lng: latLngAlt[1], distance: this.beacons[i].accCK, elevation: latLngAlt[2]});           
            }    
            let triPoint: any = this.routingService.trilaterate(this.tricons);
            return {lat: triPoint.lat, lng: triPoint.lng};        
        } catch(e) { 
            console.error("BEACON POSITION ERROR:");
            console.log(e);
        };        
    }

    public getCurrentPositionGPS() {
        let lat, lng;
        this.geolocation.getCurrentPosition({enableHighAccuracy:true, timeout: 3000}).then((position) => {
            lat = position.coords.latitude;
            lng = position.coords.longitude;
            this.posGPS = lat + ", " + lng;
        }, (e) => {
            console.error("GPS POSITION ERROR");
            console.log(e);
            // console.error(e);
            lat = 0;
            lng = 0;
            this.posGPS = lat + ", " + lng;
        });
    }

    public togglePosition() {
        if (this.statePos == 'off') {
            this.statePos = 'on';
            this.index = 0;
            this.failureIndex = 0;
            this.dataX = "x: [";
            this.dataPosBeacons = "y-B: [";
            this.dataPosGPS = "y-G: [";
        } else {
            this.statePos = 'off';
            let data = this.dataX + "] \n" + this.dataPosBeacons + "] \n" + this.dataPosGPS;
            console.log("THIS.STATEPOS = " + this.statePos);
            console.log(data); 
            this.index = 0;
            this.fileService.createFile(this.inputText, data);
            console.log("Dava saved: " + this.inputText + "\n ###########################");
        }         
    }

    public logPositionData() {        
        this.dataX += this.index + ", "
        this.dataPosBeacons += this.posBeacons + "; "
        this.dataPosGPS += this.posGPS + "; "
        /* console.log("dataX: " + this.dataX);
        console.log("dataPosBeacons: " + this.dataPosBeacons);
        console.log("dataPosGPS: " + this.dataPosGPS); */
        this.index++;
    }

    public calcKalman() {
        let data1 = [133.495206730387, 132.11444041207747, 131.2035379895932, 132.2170839541439, 132.22055561054094, 131.8536726267366, 132.30984507127607, 132.29149303213538, 131.43521025224717, 132.56275050807406, 133.42834436779887, 132.10991366908283, 130.73631960438541, 132.70916277790195, 132.58816677747694, 132.13300986731267, 132.21520380761075, 133.35256254493578, 132.39046344245958, 132.1270996445103, 131.4586609403401, 131.58829672266344, 130.65343528722275, 132.04655884435388, 131.95516764635244, 131.82115590876177, 131.80146561484676, 131.93337509422184, 131.6895073785246, 132.00374022903372];
        let data2 = [120.1015315210928, 123.17314988604426, 122.65446235696939, 123.18777440487281, 122.01183792177531, 121.80103981722166, 122.19176856935036, 121.69035330900087, 121.48837056132433, 122.28504800551542, 122.3007248091534, 121.39583109518807, 122.383867414664, 122.725415602031, 121.81691716494018, 121.76233541024044, 122.3538029247089, 121.75760482426614, 122.45161742529916, 120.27167791897801, 113.94650522813939, 117.27669044388458, 117.85010742000546, 118.07195725915457, 118.11533228482077, 118.55410408644366, 117.74388465176608, 117.35182082028342, 118.37337522508119, 117.50068274528718];
        let data3 = [184.33448324278632, 186.44458959746856, 186.05600986408393, 186.76869483278247, 188.07510951549287, 188.104348979137, 188.26221615075593, 187.64352861436487, 189.27986370922306, 187.99673249527154, 189.52026080569217, 188.5590636300545, 187.994978471778, 188.04219730718515, 187.808204240543, 188.75825693077633, 189.1876142461481, 188.98846503140683, 188.83783852161469, 188.49936045977105, 189.8912458422835, 188.9599098832454, 188.7666549959008, 188.86778255562731, 189.746165892488, 189.58432734341193, 189.14705145095806, 189.96287658629402, 187.96075407258505, 188.48946049681115];
        
        let calc1 = this.calcData(data1);
        this.logData(calc1[0], calc1[1]);
        let calc2 = this.calcData(data2);
        this.logData(calc2[0], calc2[1]);
        let calc3 = this.calcData(data3);
        this.logData(calc3[0], calc3[1]);        
    }

    public calcData(data) {
        let rssis: any[] = [];
        let rssiKArray: any[] = [];
        let accKArray: any[] = [];
        for (let x in data) {
            if (rssis.length < 20) {
                rssis.push(data[x]);
            }            
            else {
                rssis.splice(0, 1);
                rssis.push(data[x]);
            }
            if (rssis.length > 0) {
                let kalman = new KalmanService();
                let dataConstantKalman = rssis.map(function(v) {
                    return kalman.filter(v, 2, 10, 1, 0, 1);
                });
                let index = dataConstantKalman.length - 1;
                //console.log("Constant Kalman[length]: " + dataConstantKalman.length + ", " + dataConstantKalman[index]);
                let rssiK = dataConstantKalman[index].toFixed(2);
                rssiKArray.push(rssiK);
                let accK = (Math.pow(10, (-31 - rssiK) / (10 * 3.75))).toFixed(2);
                accKArray.push(accK);
            }   
        }
        return [rssiKArray, accKArray];
    }

    public logData(rssiKArray: any, accKArray: any) {
        let rssiKStr = "RSSI-K: [";
        for (let i = 0; i < rssiKArray.length; i++) {
            rssiKStr += rssiKArray[i] + ", ";
        }
        console.log(rssiKStr);
        let accKStr = "ACC-K: [";
        for (let i = 0; i < accKArray.length; i++) {
            accKStr += accKArray[i] + ", ";
        }
        console.log(accKStr);
        console.log("###################################");
    }
}
