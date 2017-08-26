import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Geolocation } from '@ionic-native/geolocation';

import { BeaconService } from '../../services/beaconservice';
import { FileService } from '../../services/fileservice';
import { RoutingService } from '../../services/routingservice';

import * as beacondata from '../../assets/data/beacondata.json';

@Component({
  selector: 'page-beacon',
  templateUrl: 'beacon.html',
})
export class BeaconPage {

    public beacons: any[] = [];
    public tricons: any[] = [];
    
    public inputText;
    public index = 0;

    public stateQIsB = 'off';  
    public dataX;
    public dataQIsBy;
    public dataQIsBz;

    public statePos = 'off';
    public posBeacons;
    public posGPS;
    public dataPosBeacons;
    public dataPosGPS;


    constructor(private geolocation: Geolocation,
                public beaconService: BeaconService,
                public fileService: FileService,
                public routingService: RoutingService) {
        
    }

    ionViewDidLoad() {
        console.log('ionViewDidLoad IBeacon');    
        this.beaconService.setupBeacons();
        this.beaconService.startRangingBeacons();
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
            this.getCurrentPositionGPS();
        }, 1000); 
        setInterval(() => { 
            console.log("Beacons: " + this.posBeacons);
            console.log("GPS: " + this.posGPS);
        }, 10000);        
    }    

    public checkBeacons() {
        try {
            this.beacons = this.beaconService.getBeacons();
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
            this.dataX = "x: [";
            this.dataQIsBy = "y-R: [";
            this.dataQIsBz = "z-RK: ["
        } else {
            this.stateQIsB = 'off';
            console.log("THIS.STATEQIsB = " + this.stateQIsB);
            let data = this.dataX + "] \n" + this.dataQIsBy + "] \n" + this.dataQIsBz + "]";
            console.log(data); 
            this.index = 0;
            this.fileService.createFile(this.inputText, data);
        }            
    }

    public logBeaconDataQIsB() {        
        this.dataX += this.index + ", "
        let outOfRange = 0;
        for (let x in this.beacons) {
            if (this.beacons[x].identifier == "QIsB") {
                this.dataQIsBy += this.beacons[x].rssi + ", ";
                // this.dataQIsBy += this.beacons[x].accCK + ", ";
                this.dataQIsBz += this.beacons[x].rssiK + ", ";
                outOfRange = 1;
                break;
            }
        }   
        if (outOfRange == 0) this.dataQIsBy += 0 + ", ";
        console.log("Index X: " + this.dataX);
        console.log("dataQIsBy: " + this.dataQIsBy);        
        console.log("dataQIsBz: " + this.dataQIsBz);           
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
        } catch(e) { console.log("ERROR: " + e)};        
    }

    public getCurrentPositionGPS() {
        let lat, lng;
        this.geolocation.getCurrentPosition({enableHighAccuracy:true, timeout: 1000}).then((position) => {
            lat = position.coords.latitude;
            lng = position.coords.longitude;
            this.posGPS = lat + ", " + lng;
        }, (error) => {
            lat = 0;
            lng = 0;
            this.posGPS = lat + ", " + lng;
        });
    }

    public togglePosition() {
        if (this.statePos == 'off') {
            this.statePos = 'on';
            this.index = 0;
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
        }         
    }

    public logPositionData() {        
        this.dataX += this.index + ", "
        this.dataPosBeacons += this.posBeacons + "; "
        this.dataPosGPS += this.posGPS + "; "
        console.log("dataX: " + this.dataX);
        console.log("dataPosBeacons: " + this.dataPosBeacons);
        console.log("dataPosGPS: " + this.dataPosGPS);
        this.index++;
    }
}
