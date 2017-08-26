import { Component } from '@angular/core';
import { NavController, NavParams, Platform } from 'ionic-angular';
import { Observable } from 'rxjs/Observable';


import { FileService } from '../../services/fileservice';


declare let WifiWizard: any;

@Component({
  selector: 'page-hotspot',
  templateUrl: 'hotspot.html'
})
export class HotSpotPage {  

    public networks: any[] = [];
    public tx = 47;

    constructor(public platform: Platform) {

    }  

    ionViewDidLoad() {
        this.platform.ready().then(() => {
            //this.networks = this.wifi.startScan();
            //this.networks = this.wifi.getScanResults();

            /* this.wifi.startScan().subscribe(data => {  
                this.networks = data;
                console.log("OBSERVER: " + data[0].SSID);
            }) */
            this.startScan();

            console.log("TEST");
            for (let x in this.networks) {
                console.log("blabla");
                console.log("Hotspot.ts: " + this.networks[x].ssid);
            }

            setInterval(() => { 
                //this.getScanResults();
                /* this.wifi.startScan().subscribe(data => { 
                    this.networks = data;
                    console.log(this.networks[0].level);
                 }) */
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
            for (let x = 0; x < a.length; x++) {                    
                if (x > 4) break;
                //console.log(a[x].SSID + ", " + a[x].BSSID + ", " + a[x].level);  
                this.networks.push({
                    SSID: a[x].SSID,
                    BSSID: a[x].BSSID,
                    level: a[x].level,
                    frequency: a[x].frequency,
                    capabilities: a[x].capabilities});                
            }  
        }
        WifiWizard.startScan(successNetwork, failNetwork);
    }
}