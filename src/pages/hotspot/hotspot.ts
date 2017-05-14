import { Component } from '@angular/core';
import { NavController, NavParams, Platform } from 'ionic-angular';
import { Observable } from 'rxjs/Observable';

import { WifiService } from '../../services/wifiservice';


declare let WifiWizard: any;

@Component({
  selector: 'page-hotspot',
  templateUrl: 'hotspot.html'
})
export class HotSpotPage {  

    public networks: any[] = [];

    constructor(public platform: Platform, public wifi: WifiService) {

    }  

    ionViewDidLoad() {
        this.platform.ready().then(() => {
            //this.networks = this.wifi.startScan();
            //this.networks = this.wifi.getScanResults();

            this.wifi.startScan().subscribe(data => {  
                this.networks = data;
                console.log("OBSERVER: " + data[0].SSID);
            })

            console.log("TEST");
            for (let x in this.networks) {
                console.log("blabla");
                console.log("Hotspot.ts: " + this.networks[x].ssid);
            }
        });
    }

    getScanResults() {
        console.log("SCAN RESULTS");
        this.networks = this.wifi.getScanResults();
    }

    /*startScan() {
        if (typeof WifiWizard !== 'undefined') {
                console.log("WifiWizard loaded: ");
                console.log(WifiWizard);
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
            for (let x in a) {                    
                console.log(a[x].SSID + ", " + a[x].BSSID + ", " + a[x].level);  
                this.networks.push({
                    ssid: a[x].SSID,
                    bssid: a[x].BSSID,
                    level: a[x].level});                
            }  
        }
        WifiWizard.startScan(successNetwork, failNetwork);
    }*/
}