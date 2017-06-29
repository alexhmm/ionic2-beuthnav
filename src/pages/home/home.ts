import { Component, ViewChild, ElementRef } from '@angular/core';
import { NavController, Platform } from 'ionic-angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { trigger, state, transition, style, animate } from '@angular/animations';
import { Geolocation } from '@ionic-native/geolocation';
import { Http } from '@angular/http';

import { BeaconService } from '../../services/beaconservice';
import { DatabaseService } from '../../services/databaseservice';
import { KalmanService } from '../../services/kalmanservice';
import { MapService } from '../../services/mapservice';
import { MotionService } from '../../services/motionservice';

import * as mapdata from '../../assets/data/mapdata.json';
//import * as beuthdata from '../../assets/data/beuthdata.json';

declare var google;


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
        trigger('infoViewInOut', [
            state("in", style({
                transform: 'translate3d(0, 0%, 0)'
            })),
            state('out', style({
                transform: 'translate3d(0, 100%, 0)'
            })),
            transition('in => out', animate('100ms ease-in')),
            transition('out => in', animate('100ms ease-out'))
        ]),
    ]
})

export class HomePage {

    @ViewChild('map') mapelement: ElementRef;
    map: any;
    public listViewState = 'out';
    public infoViewState = 'out';
    public mapViewState = 'on'
    public allrooms: any[] = [];
    public allroomsBackup: any[] = [];
    public attributes = {name: "", type: "", desc: ""};
    public selectedRoom: any[] = [];
    public polygons: any[] = [];
    public marker;
    public polyline;
    public circle;

    // step detection test
    public motionStatus = 0;
    public x = 0;
    public y = 0;
    public z = 0;
    public accValueLowPass;
    public steps = 0;
    public direction;
    public directionValues: any[] = [];
    public compassPts: any[] = [];
    public centroidPts: any[] = [];
    public polylineIndex = 6;

    // location variables
    public previousBuilding;
    public previousLevel;
    public currentPosition;
    public currentBuilding = "";
    public currentAttr;
    public currentCoords;
    public currentLevel = 0;

    // beacon variables
    public beacons: any[] = [];
    public rssis: any[] = [];
    public tricons: any[] = [];
    public triconsACC: any[] = [];

    constructor(public navCtrl: NavController,
                public platform: Platform,
                public geolocation: Geolocation,
                public beaconService: BeaconService,                
                public dbService: DatabaseService,
                public mapService: MapService,
                public motionService: MotionService) {    
        this.initializeRoomListView();        
    }

    ionViewDidLoad() {
        this.platform.ready().then(() => {     
            // Beacons            
            this.beaconService.setupBeacons();    
            //setTimeout(() => { this.beaconService.startRangingBeacons(); }, 3000);    
            this.beaconService.startRangingBeacons();

            // Interval positioning from available methods
            setInterval(() => { 
                this.checkBeacons();
                if (this.mapViewState == 'on') {
                    this.getCurrentPosition();
                    this.getCurrentBuilding();                     
                    /*if (this.currentBuilding != this.previousBuilding) {
                        this.loadMap(this.currentBuilding, this.currentLevel);
                    }*/
                }
             }, 3000);

            // Initialize DeviceOrientation
            if ((<any>window).DeviceOrientationEvent) {
                console.log("DeviceOrientationevent available");
                window.addEventListener('deviceorientation', (eventData) => {
                    //var dir = eventData.alpha
                    //deviceOrientationHandler(dir);
                    //this.direction = 360 - Math.ceil(dir);
                    let dir = 360 - Math.ceil(eventData.alpha);
                    if (this.directionValues.length < 11) {
                        this.directionValues.push(dir);
                        //this.direction = this.motionService.getMedian(this.directionValues);
                    } else {
                        this.directionValues.splice(0, 1);
                        this.directionValues.push(dir);
                        //this.direction = this.motionService.getMedian(this.directionValues);
                    }        
                    if (this.directionValues.length > 0)             {
                        let kalman = new KalmanService();
                        let dataConstantKalman = this.directionValues.map(function(v) {
                            return kalman.filter(v, 4, 10, 1, 0, 1);
                        });
                        let index = dataConstantKalman.length - 1;
                        //console.log("Constant Kalman[length]: " + dataConstantKalman.length + ", " + dataConstantKalman[index]);
                        this.direction = dataConstantKalman[index];
                    }
                    //console.log("Dir: " + this.direction);
                }, false);
            } else {
                console.log("No DeviceOrientationEvent available");
            };            
        });
    }



    // UI
    public toggleListView() {
        this.listViewState = (this.listViewState == 'out') ? 'in' : 'out';
        console.log("ListViewState: " + this.listViewState);
    }

    public toggleInfoView() {
        this.infoViewState = (this.infoViewState == 'out') ? 'in' : 'out';
        console.log("InfoViewState: " + this.infoViewState);
    }

    public toggleMapView() {
        this.mapViewState = (this.mapViewState == 'on') ? 'off' : 'on';
        console.log("MapViewState: " + this.mapViewState);        
    }

    public initializeRoomListView() {    
        this.dbService.getRoomList().subscribe(data => {
            this.allrooms = data;
            this.allroomsBackup = this.allrooms;
        });
    }



    /**
     * 
     */
    public loadMapStyles() { 
        console.log("Loadmapstyles");
        let mapOptions = {
            //center: latlng,
            center: {lat: 52.545165, lng: 13.355360},
            zoom: 18,
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false,
            styles: mapdata.styles,
            mapTypeId: google.maps.MapTypeId.ROADMAP
            //mapTypeId: google.maps.MapTypeId.SATELLITE
        }

        this.map = new google.maps.Map(this.mapelement.nativeElement, mapOptions);

        // Zoom changed listener
        google.maps.event.addListener(this.map, 'zoom_changed', () => {
            //console.log("Zoom changed: " + this.getMapZoom());
            if (this.circle != null) {  
                let radius = this.mapService.getCircleRadius(this.getMapZoom());
                //console.log("Circle radius: " + radius);
                this.circle.setRadius(radius);
            }            
        });
    }

    /**
     * Loads polygon data on google map
     * @param floor 
     */
    public loadMap(building: any, level: any) { 
        console.log("Interval: loadMap()");
        this.loadMapStyles();    
        if (this.polygons != null) {
            for (let x in this.polygons) {
                this.polygons[x].setMap(null);
            }
            this.polygons = [];
        }

        if (this.currentAttr != null && this.currentLevel != null) {
        // SQLite Code with Observable
        //this.dbService.selectRooms("d00").subscribe(data => {  
            this.dbService.getAllRoomsAttrCoords(this.currentAttr, this.currentCoords).subscribe(data => {
                for (let x in data) {
                    //console.log("LOADMAP: " + data[x].name + ", " + data[x].type + ", " + data[x].desc + ", " + data[x].coordinates);
                    let room: any = {};
                    let paths: any[] = [];

                    room = data[x];

                    let allCoordinates = room.coordinates;
                    let coordinates: String[] = allCoordinates.split("; ");

                    // split all coordinates to LatLng paths
                    paths = this.mapService.splitCoordinatesToLatLng(coordinates);                    

                    let polygon = new google.maps.Polygon();
                    polygon.setOptions(this.mapService.createPolygonOptions(paths, room.type));
                    polygon.setMap(this.map);

                    this.polygons.push(polygon);

                    if (room.type == "lab" || room.type == "lecture" || room.type == "office" || room.type == "service" || room.type == "wc") {
                        //console.log("TYPE: " + room.type);
                        google.maps.event.addListener(polygon, 'click', (event) => {
                            //console.log("CLICK: " + event.latLng + ", shapeid: " + room.shapeid);
                            //let attributes = this.getAttributesByShapeId(room.shapeid);
                            let attributes = {name: room.name, desc: room.desc};
                            this.openInfoView(event, attributes);
                        })
                    }
                }   
                console.log("LOAD MAP LENGTH: " + this.polygons.length);
            })  
        }
    }   

    /**
     * 
     */
    public getCurrentPosition() {
        console.log("Interval: getCurrentPosition()");
        if (this.circle != null) {
            this.circle.setMap(null);
        }  
        if (this.beacons.length > 2) {
            this.currentPosition = this.getCurrentPositionBeacons();
        } else {
            this.currentPosition = this.getCurrentPositionGPS();
        }

        if (this.map != null) {
            let center = new google.maps.LatLng(this.currentPosition.lat, this.currentPosition.lng);
            this.circle = new google.maps.Circle();
            this.circle.setOptions(this.mapService.createCircleOptions(this.currentPosition, (this.mapService.getCircleRadius(this.getMapZoom()).toFixed(4))));
            this.circle.setMap(this.map);
        }
        //this.map.panTo(center);
    }

    /**
     * 
     */
    public getCurrentBuilding() {
        //console.log("Interval: getCurrentBuilding()");
        this.previousBuilding = this.currentBuilding;
        // containsLocation() || isLocationOnEdge()
        this.currentBuilding = "Bauwesen";
        console.log("BUILDING prev: " + this.previousBuilding + ", current: " + this.currentBuilding);
        if (this.currentBuilding != this.previousBuilding) {
            this.dbService.getAttrCoordsTables(this.currentBuilding, this.currentLevel).subscribe(data => {
                this.currentAttr = data.attr;
                this.currentCoords = data.coords;                
                this.loadMap(this.currentBuilding, this.currentLevel);                
            });
        }
    }

    public getMapZoom() {
        return this.map.getZoom();
    }

    public getRoomListView(event: any) {
        if (this.infoViewState == 'in') {
                this.toggleInfoView();
        }   
        //this.initializeRooms();
        this.allrooms = this.allroomsBackup;

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

    /**
     * Returns room attributes by shape id
     * @param shapeid 
     */
    public getAttributesByShapeId(shapeid: any) {
        this.dbService.getAttributesByShapeId(this.currentBuilding, shapeid).subscribe(data => {
            return data;
        })
    }

    /**
     * Opens info view for specific room
     * @param event 
     * @param attributes 
     */
    public openInfoView(event: any, attributes: any) {
        // function currentBuilding TBA
        console.log("GET ROOM INFO: " + this.polygons.length);

        this.attributes.name = attributes.name;
        this.attributes.desc = attributes.desc;
        if (this.infoViewState == 'out') {
            this.toggleInfoView();
        }

        let latLngStr = event.latLng + "";
        let latLngStrSub = latLngStr.substring(1, latLngStr.length);
        this.addMarker(latLngStrSub);        
    }

    /**
     * 
     * @param room 
     */
    public selectRoom(room: any) {
        console.log("Selected room.name: " + room.name);    
        console.log("Before: " + this.infoViewState);
        // Observable SQLite Code
        this.dbService.selectRoom(room.name, room.table, room.shapeid).subscribe(data => {   
            let mapRoomCentroid: any = {lat: 0, lng: 0};
            mapRoomCentroid = this.mapService.getPolygonCentroid(data);

            if (this.listViewState == 'in') {
                this.toggleListView();
            }
            this.attributes.name = room.name;
            this.attributes.desc = room.desc;
            if (this.infoViewState == 'out') {
                this.toggleInfoView();
                console.log("Info: " + this.infoViewState);
            }     
        });
    }

    /**
     * Adds a marker to a specific position on the map
     * @param position
     */
    public addMarker(position: any) {
        if (this.marker != null) {
            this.marker.setMap(null);
        }    

        let latLngSplit = position.split(", ");
        console.log("Split latLng: " + latLngSplit[0] + ", " + latLngSplit[1]);
        let latLng = {lat: parseFloat(latLngSplit[0]), lng: parseFloat(latLngSplit[1])};
        console.log("Marker latLng: " + latLng.lat + ", " + latLng.lng);

        this.marker = new google.maps.Marker({
            map: this.map,
            animation: google.maps.Animation.DROP,
            position: { lat: latLng.lat, lng: latLng.lng }
        });

        google.maps.event.addListener(this.marker, 'click', () => {
            this.marker(this.map.setMap(null));
            this.toggleInfoView();
        });

        //this.addInfoWindow(this.marker, content);
        let center = new google.maps.LatLng(latLng.lat, latLng.lng);
        // using global variable:
        this.map.panTo(center);
    }

    /**
     * Adds InfoWindow to marker position
     * @param marker
     * @param content 
     */
    public addInfoWindow(marker, content) {
        let infoWindow = new google.maps.InfoWindow({
            content: content
        });

        infoWindow.open(this.map, marker);

        google.maps.event.addListener(marker, 'click', () => {
            infoWindow.open(this.map, marker);
        });
    }   

    public getCurrentPositionGPS() {
        console.log("CURRENT Position GPS."); 
        this.geolocation.getCurrentPosition({timeout: 5000, enableHighAccuracy:true}).then((position) => {            
            console.log("GPS POSITION: " + position.coords.latitude + ", " + position.coords.longitude);
            return {lat: position.coords.latitude, lng: position.coords.longitude}
        }, (error) => {
            console.log("" + error);
        });
    }     

    // ################# //
    // #### BEACONS #### //
    // ################# //
    public checkBeacons() {
        let str = "CHECK BEACONS: ";
        try {
            this.beacons = this.beaconService.getBeacons();
            for (let x in this.beacons) {
                str += this.beacons[x].identifier + ", ";
            }
            console.log(str);
            //this.beaconService.getBeaconsC();
        } catch(e) {
            console.log(e);
        }
    }

    public startRangingBeacons() {
        this.beaconService.startRangingBeacons();  
    }

    public getCurrentPositionBeacons() {
        //console.log("CURRENT Positon Beacons.")
        if (this.circle != null) {
            this.circle.setMap(null);
        }  
        this.tricons = [];
        this.triconsACC = [];        
        for (let i = 0; i < 3; i++) {
            let height;
            //console.log("B - " + i + ": " + beacons[i].identifier + "; " + beacons[i].coordinates + "; " + beacons[i].accCK);
            let latLngAlt = this.beacons[i].coordinates.split(", ");                
            this.tricons.push({lat: latLngAlt[0], lng: latLngAlt[1], distance: this.beacons[i].accCK, height: latLngAlt[2]});
            this.triconsACC.push({lat: latLngAlt[0], lng: latLngAlt[1], distance: this.beacons[i].acc, height: latLngAlt[2]});
            //console.log("T - " + i + ": " + this.tricons[i].lat + ", " + this.tricons[i].lng + ", " + this.tricons[i].distance + ", " + this.tricons[i].height);                
        }    
        let triStr: any = this.mapService.trilaterate(this.tricons);
        //console.log("Beacon Tri Position: " + triStr);
        let triStrACC: any = this.mapService.trilaterate(this.triconsACC);
        //console.log("Beacon Tri Position ACC: " + triStrACC);
        let splitTriPt = triStr.split(", ");
        return {lat: +splitTriPt[0], lng: +splitTriPt[1]};        
    }

    // ################ //
    // #### MOTION #### //
    // ################ //
    public routingMotion() {
        this.toggleMapView();
        console.log("Start motion routing.");
        let startPosition;
        this.mapService.getCurrentPositionGPS().subscribe(data => {
            startPosition = data;
            console.log("Start Position: " + startPosition.lat + ", " + startPosition.lng);
            this.startRoutingMotion(startPosition);
        });    
    }

    public startRoutingMotion(startPosition) {
        this.compassPts = [];
        this.currentPosition = startPosition.lat + ", " + startPosition.lng;
        this.compassPts.push(this.currentPosition);

        if (this.motionStatus === 0) {
            this.motionStatus = 1;
            this.motionService.startWatchingAcceleration().subscribe(data => {    
                this.x = data.x;
                this.y = data.y;
                this.z = data.z;
                this.accValueLowPass = this.motionService.accelerationLowPass(this.x, this.y, this.z);      
                let prevSteps = this.steps;     
                this.steps = this.motionService.stepDetection(this.accValueLowPass);  
                if (prevSteps < this.steps) {
                    this.currentPosition = this.mapService.getCurrentPositionCompass(this.currentPosition, 0.63, this.direction);
                    let currentPt = this.currentPosition.split(", ");
                    this.centroidPts.push({lat: currentPt[0], lng: currentPt[1]});
                    console.log("STEPS: " + this.steps);
                    // add centroid point of last 5 measured points to polyline, reset array
                    if (this.polylineIndex > 5) {
                        let centroidPt = this.mapService.getPolygonCentroid(this.centroidPts);
                        this.compassPts.push(this.currentPosition);
                        this.polylineIndex = 0;
                        this.centroidPts = [];
                    }
                    console.log("CompassPts Length: " + this.compassPts.length);
                    this.paintRoute(this.compassPts);
                    this.polylineIndex++;
                }
            });
        } else {
            this.motionService.stopWatchingAcceleration();
            this.motionStatus = 0;
        }
    }

    public paintRoute(points: any) {
        if (this.polyline != null) {
            this.polyline.setMap(null);
        }  
        if (this.mapViewState == 'on') {
            this.toggleMapView();
        }
        let latLngPts = this.mapService.splitCoordinatesToLatLng(points);
        this.polyline = new google.maps.Polyline();
        this.polyline.setOptions(this.mapService.createPolylineOptions(latLngPts));
        this.polyline.setMap(this.map);
        let center = new google.maps.LatLng(latLngPts[latLngPts.length-1].lat, latLngPts[latLngPts.length-1].lng);
        this.map.panTo(center);

        let lengthInMeters = google.maps.geometry.spherical.computeLength(this.polyline.getPath());
        console.log("Polyline length: " + lengthInMeters);
    }
}
