import { Injectable } from '@angular/core'; 
import { Observable } from 'rxjs/Observable';

declare let WifiWizard: any;

@Injectable()
export class WifiService {  

public networks: any[] = [];

    constructor() {

    }  

    startScan() {
        return Observable.create(observer => {
            if (typeof WifiWizard !== 'undefined') {
                    console.log("WifiWizard loaded: ");
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
                    console.log(a[x].SSID + ", " + a[x].BSSID + ", " + a[x].level + ", " + a[x].frequency + ", " + a[x].capabilities);  
                    observer.next(x);
                    this.networks.push({
                        SSID: a[x].SSID,
                        BSSID: a[x].BSSID,
                        level: a[x].level,
                        frequency: a[x].frequency,
                        capabilities: a[x].capabilities});
                }                  
            }
            WifiWizard.startScan(successNetwork, failNetwork);
            observer.complete();
        })
    }

    getScanResults(): any[] {
        return this.networks;
    }
}