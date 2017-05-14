import { Component, ViewChild, ElementRef, trigger, state, style, animate, transition } from '@angular/core';
import { NavController, Platform } from 'ionic-angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Geolocation } from '@ionic-native/geolocation';

import { DatabaseService } from '../../services/database';
import { MapService } from '../../services/mapservice';

import * as mapdata from '../../assets/data/mapdata.json';
import * as beuthdata from '../../assets/data/beuthdata.json';

declare var google;

enum Roomtype {
    lab = <any>"#FF0000",
    lecture = <any>"#00FF00",
    wc = <any>"#00FFFF"
}

enum Floor {
    d00 = beuthdata.d00,
    d01 = beuthdata.d01
}

@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
  providers: [DatabaseService],
  animations: [
        trigger('listViewInOut', [
            state("in", style({
                transform: 'translate3d(0, 0%, 0)'
            })),
            state('out', style({
                transform: 'translate3d(0, 100%, 0)'
            })),
            transition('in => out', animate('200ms ease-in')),
            transition('out => in', animate('200ms ease-out'))
        ]),
    ]
})

export class HomePage {

    @ViewChild('map') mapelement: ElementRef;
    map: any;
    public listViewState = 'out';
    public allrooms: any[] = [];
    public selectedRoom: any[] = [];
    public marker;

    constructor(public navCtrl: NavController, public platform: Platform, public geolocation: Geolocation, public mapservice: MapService) {    
        let d00 = "d00"
        let floor = Floor[d00];

        console.log("FLOOR NAME: " + floor[0].name + floor[1].coordinates);  

        this.initializeRooms();

        // WORKING
        /*for (let i = 0; i < beuthdata.d00.length; i++) {
            let room = beuthdata.d00[i];
            this.allrooms.push(room);
        }
        for (let i = 0; i < beuthdata.d01.length; i++) {
            let room = beuthdata.d01[i];
            this.allrooms.push(room);
        }*/

        // NOT WORKING
        /*for (let floor in beuthdata) {            
            for (let i = 0; i < floor.length; i++) {
                let room = floor[i];
                this.allrooms.push(room);
            }
        }*/

        console.log("PUSHED ROOM TEST: " + this.allrooms[3].name);

        //this.allrooms = floor;

        //console.log("PUSHED ROOM TEST: " + this.allrooms[3].name);
    }

    ionViewDidLoad() {
        this.platform.ready().then(() => {   
            // placeholder: function to get nearest building
            let floortype = "d00";  
            this.loadMap(floortype);
        });
    }

    toggleListView() {
        this.listViewState = (this.listViewState == 'out') ? 'in' : 'out';
        console.log("STATE: " + this.listViewState);
    }

    listViewIn() {
        this.listViewState = 'in';
    }

    listViewOut() {
        this.listViewState = 'out';
    }

    initializeRooms() {
        this.allrooms = [];
        for (let i = 0; i < beuthdata.d00.length; i++) {
            let room = beuthdata.d00[i];
            this.allrooms.push(room);
        }
        for (let i = 0; i < beuthdata.d01.length; i++) {
            let room = beuthdata.d01[i];
            this.allrooms.push(room);
        }

    }

    loadMapStyles() { 
        let mapOptions = {
            //center: latlng,
            center: {lat: 52.545165, lng: 13.355360},
            zoom: 18,
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false,
            styles: mapdata.styles,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        }

        this.map = new google.maps.Map(this.mapelement.nativeElement, mapOptions);
    }

    loadMap(floor: any) { 
        this.loadMapStyles();

        let allrooms: any = Floor[floor];

        for (let x in allrooms) {
            let type = allrooms[x].type;
            let JSONcoordinates = allrooms[x].coordinates;
            //console.log("TYPE: " + type + "COOR; " + JSONcoordinates);
            let coordinates: String[] = JSONcoordinates.split("; ");

            // split all coordinates to LatLng paths
            let paths: any[] = this.mapservice.splitCoordinatesToLatLng(coordinates);

            let polygon = new google.maps.Polygon();
            polygon.setOptions(this.mapservice.createRoomPolygonOptions(paths, type));
            polygon.setMap(this.map);   

            let centroid = this.mapservice.getPolygonCentroid(paths);

            google.maps.event.addListener(polygon, 'click', () => {
                this.addMarker(centroid, allrooms[x].desc);
            });
        }
        
        // SQLite Code with Observable
        /*this.dbService.getRooms("d00").subscribe(data => {  
            for (let x in data) {
                let room: any = {};
                let paths: any[] = [];

                room = data[x];

                let allCoordinates = room.coordinates;
                let coordinates: String[] = allCoordinates.split("; ");

                // split all coordinates to LatLng paths
                paths = this.maptools.splitCoordinatesToLatLng(coordinates);

                let polygon = new google.maps.Polygon();
                polygon.setOptions(this.maptools.createRoomPolygonOptions(paths, room.type));
                polygon.setMap(this.map);
            }    
        })  */  
    }

    public getInfo(event: any) {
        this.initializeRooms();

        let value = event.target.value;

        if (value && value.trim() != '') {                        
            this.allrooms = this.allrooms.filter((room) => {
                return (room.name.toLowerCase().indexOf(value.toLowerCase()) > -1 || room.desc.toLowerCase().indexOf(value.toLowerCase()) > -1);
            })
            if (this.listViewState == 'out') {
                this.toggleListView();
            }
        } else {
            if (this.listViewState == 'in') {
                this.toggleListView();
            }
        }      
    }

    selectRoom(room: any) {
        console.log("Selected room.name: " + room.name);

        //this.allrooms = this.mapservice.getAllRooms(); 

        try {
            let index = this.allrooms.map(function(e) { return e.name; }).indexOf(room.name);
            let selectedRoom = this.allrooms[index];
            console.log("Selected room index: " + selectedRoom.name);

            let mapRoomAllCoordinates: any[] = [];
            let mapRoomCoordinates: any[] = selectedRoom.coordinates.split("; ");

            mapRoomAllCoordinates = this.mapservice.splitCoordinatesToLatLng(mapRoomCoordinates);

            let mapRoomCentroid: any = {lat: 0, lng: 0};
            mapRoomCentroid = this.mapservice.getPolygonCentroid(mapRoomAllCoordinates);

            if (this.listViewState == 'in') {
                this.toggleListView();
            }

            this.addMarker(mapRoomCentroid, selectedRoom.desc);

        } catch (e) {
            console.log ("Index error: " + e);
        }

        // Observable SQLite Code
        /*this.dbService.getRoom(room.name, room.table).subscribe(data => {
            let mapRoomAllCoordinates: any[] = [];
            let mapRoomCoordinates: any[] = data.coordinates.split("; ");

            mapRoomAllCoordinates = this.mapservice.splitCoordinatesToLatLng(mapRoomCoordinates);

            let mapRoomCentroid: any = {lat: 0, lng: 0};
            mapRoomCentroid = this.mapservice.getPolygonCentroid(mapRoomAllCoordinates);

            if (this.listViewState == 'in') {
                this.toggleListView();
            }

            this.addMarker(mapRoomCentroid, data.desc);
        });*/
    }

    addMarker(centroid: any, content: any) {
        if (this.marker != null) {
            this.marker.setMap(null);
        }        
        this.marker = new google.maps.Marker({
            map: this.map,
            animation: google.maps.Animation.DROP,
            position: { lat: +centroid.lat, lng: +centroid.lng }
        });

        this.addInfoWindow(this.marker, content);
        var center = new google.maps.LatLng(+centroid.lat, +centroid.lng);
        // using global variable:
        this.map.panTo(center);
    }

    addInfoWindow(marker, content) {
        let infoWindow = new google.maps.InfoWindow({
            content: content
        });

        infoWindow.open(this.map, marker);

        google.maps.event.addListener(marker, 'click', () => {
            infoWindow.open(this.map, marker);
        });
    }   

    getCurrentPositionGPS() {
        console.log("GET CURRENT GPS POSITION");
        /*let onSuccess = (position: any) => {
            console.log("GPS POSITION: " + position.coords.latitude + ", " + position.coords.longitude);
        }

        let onError = (e: any) => {
            console.log("" + e);
        }

        navigator.geolocation.getCurrentPosition(onSuccess, onError);*/
        this.geolocation.getCurrentPosition({timeout: 5000, enableHighAccuracy:true}).then((position) => {
            console.log("GPS POSITION: " + position.coords.latitude + ", " + position.coords.longitude);

            var center = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

            let circle = new google.maps.Circle();
            circle.setOptions(this.mapservice.createCircleOptions(position));
            circle.setMap(this.map);

            // using global variable:
            this.map.panTo(center);


        }, (error) => {
            console.log("" + error);
        });
    } 
}
