import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { DatabaseService } from '../../services/databaseservice';

@Component({
  selector: 'page-database',
  templateUrl: 'database.html',
})
export class DatabasePage {

    constructor(public dbService: DatabaseService) {
        
    }

    ionViewDidLoad() {
        console.log('ionViewDidLoad Database');  
    }   

    /*testInsert() {
        this.dbService.insertRoom("d00").subscribe(data => {  
        });
        //this.dbService.insertRoom();
    }

    testSelect() {
        this.dbService.selectRooms("d00").subscribe(data => {  
            console.log("Select test");
        })
    }*/
}
