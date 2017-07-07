import { Component } from '@angular/core';
import { NavController, NavParams, Platform } from 'ionic-angular';

import * as earcut from 'earcut';

@Component({
  selector: 'page-test',
  templateUrl: 'test.html'
})
export class TestPage {  

    public networks: any[] = [];

    constructor(public platform: Platform) {

    }  

    ionViewDidLoad() {
        this.platform.ready().then(() => {

        });
    }

    public testEarcut() {
        console.log(earcut([10,0, 0,50, 60,60, 70,10]));
    }
}