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
    public tx = -47;
    public rssis: any[] = [];
    
    public inputText;
    public index = 0;
    public stateSingle = 'off';  
    public dataX;
    public dataSingleY;
    public dataSingleZ;
    public failure;

    constructor(public platform: Platform,
                public fileService: FileService) {

    }  

    ionViewDidLoad() {
        this.platform.ready().then(() => {
            this.startScan();
            setInterval(() => { 
                 this.startScan();
            }, 3000);     
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
                for (let x in a) {
                    this.networks = [];
                    if (a[x].BSSID == "34:81:c4:3e:b0:8e") {
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
                if (this.networks != null) {
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
                        this.networks[0].accK = (Math.pow(10, (this.tx - this.networks[0].rssiK) / (10 * 3.5))).toFixed(2);
                    }
                }  
                else {
                    this.failure = this.index + ", ";
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
            this.dataX = "x: [";
            this.dataSingleY = "y-R: [";
            this.dataSingleZ = "z-RK: ["
            this.failure = "No signal: "
        } else {
            this.stateSingle = 'off';
            console.log("THIS.STATESINGLE = " + this.stateSingle);
            let data = this.dataX + "] \n" + this.dataSingleY + "] \n" + this.dataSingleZ + "] \n" + this.failure;
            console.log(data); 
            this.index = 0;
            this.fileService.createFile(this.inputText, data);
        }            
    }

    public logPositionData() {        
        this.dataX += this.index + ", "
        this.dataSingleY += this.networks[0].level + "; "
        this.dataSingleZ += this.networks[0].rssiK + "; "
        console.log("dataX: " + this.dataX);
        console.log("dataSingleX: " + this.dataSingleY);
        console.log("dataSingleZ: " + this.dataSingleZ);
        this.index++;
    }
}