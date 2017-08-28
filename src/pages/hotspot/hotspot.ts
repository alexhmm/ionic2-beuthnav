import { Component } from '@angular/core';
import { NavController, NavParams, Platform } from 'ionic-angular';
import { Observable } from 'rxjs/Observable';

import { FileService } from '../../services/fileservice';
import { KalmanService } from '../../services/kalmanservice';


declare let WifiWizard: any;

@Component({
  selector: 'page-hotspot',
  templateUrl: 'hotspot.html'
})
export class HotSpotPage {  

    public networks: any[] = [];
    public checkNetwork = 'single';
    public tx = -31;
    public rssis: any[] = [];
    
    public inputText;
    public index = 0;
    public failureIndex = 0;
    public stateSingle = 'off';  
    public dataX;
    public dataSingleR;
    public dataSingleRK;
    public dataSingleAccK
    public failure;

    constructor(public platform: Platform,
                public fileService: FileService) {

    }  

    ionViewDidLoad() {
        this.platform.ready().then(() => {
            this.startScan();
            setInterval(() => { 
                 this.startScan();
            }, 1000); 
        });
    }

    public startScan() {
        if (typeof WifiWizard !== 'undefined') {
                // console.log("WifiWizard loaded.");
        } else {
            console.warn('WifiWizard not loaded.');
        }              

        let successNetwork = (e: any) => {
            WifiWizard.getScanResults(listHandler, failNetwork);
        }

        let failNetwork = (e: any) => {
            console.log("" + e);
        }

        let listHandler = (a: any) => {
            this.networks = [];
            if (this.checkNetwork == 'all') {
                for (let x = 0; x < a.length; x++) {                    
                    //if (x > 4) break;
                    console.log(a[x].SSID + ", " + a[x].BSSID + ", " + a[x].level);  
                    this.networks.push({
                        SSID: a[x].SSID,
                        BSSID: a[x].BSSID,
                        level: a[x].level,
                        frequency: a[x].frequency,
                        capabilities: a[x].capabilities});                
                }  
            } else {
                this.networks = [];
                for (let x in a) {                    
                    // if (a[x].BSSID == "34:81:c4:3e:b0:8e") { // HOME
                    if (a[x].BSSID == "18:d6:c7:86:90:d6") {
                        this.networks.push({
                            SSID: a[x].SSID,
                            BSSID: a[x].BSSID,
                            level: a[x].level,
                            frequency: a[x].frequency,
                            capabilities: a[x].capabilities,
                            rssiK: 0,
                            accK: 0});  
                            break;              
                    }                    
                }  
                try {
                    if (this.rssis.length < 10) {
                        this.rssis.push(this.networks[0].level);
                    } else {
                        this.rssis.splice(0, 1);
                        this.rssis.push(this.networks[0].level);
                    }

                    if (this.rssis.length > 0) {
                        let kalman = new KalmanService();
                        let dataConstantKalman = this.rssis.map(function(v) {
                            return kalman.filter(v, 2, 10, 1, 0, 1);
                        });
                        let index = dataConstantKalman.length - 1;
                        //console.log("Constant Kalman[length]: " + dataConstantKalman.length + ", " + dataConstantKalman[index]);
                        this.networks[0].rssiK = dataConstantKalman[index].toFixed(2);
                        this.networks[0].accK = (Math.pow(10, (this.tx - this.networks[0].rssiK) / (10 * 2.5))).toFixed(2);
                    }
                }  catch(e) {
                    if (this.stateSingle == 'on') {
                        this.failure += this.index + ", ";                        
                        this.failureIndex++;
                    }
                    this.networks.push({
                                level: 0,
                                rssiK: 0,
                                accK: 0
                    })
                }            
                if (this.stateSingle == 'on') this.logPositionData();              
            }
        }
        WifiWizard.startScan(successNetwork, failNetwork);
    }

    public toggleSingle() {        
        if (this.stateSingle == 'off') {
            this.stateSingle = 'on';
            this.index = 0;
            this.failureIndex = 0;
            this.dataX = "x: [";
            this.dataSingleR = "RSSI: [";
            this.dataSingleRK = "RSSI-K: ["
            this.dataSingleAccK = "ACC-K: ["
            this.failure = "No signal: "
            this.rssis = [];
        } else {
            this.stateSingle = 'off';
            console.log("THIS.STATESINGLE = " + this.stateSingle);
            let data = this.dataX + "] \n"
                         + this.dataSingleR + "] \n" + this.dataSingleRK + "] \n" + this.dataSingleAccK + "] \n" + this.failure
                         + "\n" + "Router-TX: " + this.tx + ", Freq: " + this.networks[0].frequency + ", " + this.networks[0].capabilities;
            console.log(data); 
            this.index = 0;
            this.failureIndex = 0;
            this.fileService.createFile(this.inputText, data);
            console.log("Dava saved: " + this.inputText + "\n ###########################");
        }            
    }

    public logPositionData() {        
        this.dataX += this.index + ", "
        this.dataSingleR += this.networks[0].level + "; "
        this.dataSingleRK += this.networks[0].rssiK + "; "
        this.dataSingleAccK += this.networks[0].accK + "; "
        /* console.log("dataX: " + this.dataX);
        console.log("dataSingleRSSI: " + this.dataSingleR);
        console.log("dataSingleRSSI-K: " + this.dataSingleRK); */
        this.index++;
    }
}