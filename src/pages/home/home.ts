import { Component, ViewChild, ElementRef } from '@angular/core';
import { NavController, Platform } from 'ionic-angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { trigger, state, transition, style, animate } from '@angular/animations';
import { Geolocation } from '@ionic-native/geolocation';
import { Http } from '@angular/http';

import { BeaconService } from '../../services/beaconservice';
import { DatabaseService } from '../../services/databaseservice';
import { IntersectService } from '../../services/intersectservice';
import { KalmanService } from '../../services/kalmanservice';
import { MapService } from '../../services/mapservice';
import { MotionService } from '../../services/motionservice';
import { RoutingService } from '../../services/routingservice';

import * as mapdata from '../../assets/data/mapdata.json';

declare let google;

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
            transition('in => out', animate('100ms ease-in')),
            transition('out => in', animate('100ms ease-out'))
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
        trigger('levelViewInOut', [
            state("in", style({
                transform: 'translate3d(0, 100%, 0)'
            })),
            state('out', style({
                transform: 'translate3d(0, 80%, 0)'
            })),
            transition('in => out', animate('100ms ease-in')),
            transition('out => in', animate('100ms ease-out'))
        ]),
    ]
})

export class HomePage {

    @ViewChild('map') mapelement: ElementRef;
    map: any;

    // testing
    public emailLog = "";

    // States
    public startState = 0;
    public listViewState = 'out';
    public infoViewState = 'out';
    public levelViewState = 'in'
    public mapViewState = 'on'

    public allrooms: any[] = [];
    public allroomsBackup: any[] = [];
    public attributes = {name: "", type: "", desc: ""};
    public selectedRoom: any[] = [];
    public polygons: any[] = [];
    public marker;
    public polygon;
    public circle;    

    public trianglePolygons: any[] = [];

    // interval check
    public checkLog;

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

    // vertices
    public pVertexC;
    public nVertexC;
    public pVertexCC;
    public nVertexCC;

    constructor(public navCtrl: NavController,
                public platform: Platform,
                public geolocation: Geolocation,
                public beaconService: BeaconService,                
                public dbService: DatabaseService,
                public intersectService: IntersectService,
                public mapService: MapService,
                public motionService: MotionService,
                public routingService: RoutingService) {    
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
                this.checkLog = "CHECK LOG: ";
                this.checkBeacons();
                if (this.mapViewState == 'on') {
                    this.getCurrentPosition();
                    //this.getCurrentBuilding();                     
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
            zoomControl: false,
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

        google.maps.event.addListener(this.map, 'click', (event) => {
            console.log("CLICK MAP: " + event.latLng);
        })
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
            this.dbService.getAllBuildingsAttrCoords(this.currentBuilding).subscribe(data => {
                console.log("MAP BUILDINGS");
                let building: any = {};
                
                for (let x in data) {
                    let paths: any[] = [];

                    building = data[x];

                    let allCoordinates = building.coordinates;
                    let coordinates: String[] = allCoordinates.split(";");

                    paths = this.mapService.splitCoordinatesToLatLng(coordinates);

                    let polygon = new google.maps.Polygon();
                    polygon.setOptions(this.mapService.createPolygonBuildingOptions(paths));
                    polygon.setMap(this.map);

                    google.maps.event.addListener(polygon, 'click', (event) => {
                        //console.log("CLICK: " + event.latLng + ", shapeid: " + room.shapeid);
                        //let attributes = this.getAttributesByShapeId(room.shapeid);
                        console.log("Building name: " + building.name);
                    })
                }
            })

            // SQLite Code with Observable
            //this.dbService.selectRooms("d00").subscribe(data => {            
            this.dbService.getAllRoomsAttrCoords(this.currentAttr, this.currentCoords).subscribe(data => {
                console.log("MAP ROOMS");
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
                    polygon.setOptions(this.mapService.createPolygonRoomOptions(paths, room.type));
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
        this.checkLog += "Position-"        
        if (this.beacons.length > 2) {
            this.currentPosition = this.getCurrentPositionBeacons(); 
            this.paintCurrentPosition();
            this.getCurrentBuilding();    
            console.log(this.checkLog);              
        } else {
            //this.currentPosition = this.getCurrentPositionGPS();
            this.mapService.getCurrentPositionGPS().subscribe(data => {
                this.currentPosition = data;
                this.checkLog += "GPS: " + this.currentPosition.lat + ", " + this.currentPosition.lng;
                this.paintCurrentPosition();
                this.getCurrentBuilding();
                console.log(this.checkLog);
            });            
        }
    }

    /**
     * 
     */
    public paintCurrentPosition() {
        if (this.map != null) {
            let center = new google.maps.LatLng(this.currentPosition.lat, this.currentPosition.lng);
            if (this.circle != null) {
                this.circle.setMap(null);
            }  
            this.circle = new google.maps.Circle();
            this.circle.setOptions(this.mapService.createCircleOptions(this.currentPosition, (this.mapService.getCircleRadius(this.getMapZoom()).toFixed(4))));
            this.circle.setMap(this.map);
            //this.map.panTo(center);
        }
    }

    /**
     * 
     */
    public getCurrentBuilding() {
        //console.log("Interval: getCurrentBuilding()");
        this.previousBuilding = this.currentBuilding;
        // containsLocation() || isLocationOnEdge()
        this.currentBuilding = "Bauwesen";
        //console.log("BUILDING p: " + this.previousBuilding + ", c: " + this.currentBuilding + ", LEVEL p: " + this.previousLevel + ", c: " + this.currentLevel);
        if (this.currentBuilding != this.previousBuilding || this.currentLevel != this.previousLevel) {
            this.dbService.getAttrCoordsTables(this.currentBuilding, this.currentLevel).subscribe(data => {
                this.currentAttr = data.attr;
                this.currentCoords = data.coords;                
                this.loadMap(this.currentBuilding, this.currentLevel);    
                this.startState = 1;            
            });
        }
        this.previousLevel = this.currentLevel;
    }

    /**
     * Changes the current level on map
     * @param direction 
     */
    public changeCurrentLevel(building: any, direction: any) {
        //console.log("CHANGE CURRENT LEVEL: " + this.currentLevel + ", " + direction);
        let buildingLevels = this.mapService.getBuildingLevels(this.currentBuilding);
        //console.log("BUILDING LEVELS:", buildingLevels);
        this.currentLevel = this.mapService.changeCurrentLevel(this.currentLevel, buildingLevels, direction);
        //console.log("CURRENT LEVEL: " + this.currentLevel);
        this.getCurrentBuilding();
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
        this.addMarker(latLngStrSub, "blabla");        
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
    public addMarker(position: any, content: any) {
        /* if (this.marker != null) {
            this.marker.setMap(null);
        } */

        this.marker = new google.maps.Marker({
            animation: google.maps.Animation.DROP,
            position: new google.maps.LatLng(parseFloat(position.lat), parseFloat(position.lng)),
            title: content
        }); 

        this.marker.setMap(this.map);
        //console.log("MarkerContent: " + content);

        this.addInfoWindow(this.marker, content);
        let center = new google.maps.LatLng(parseFloat(position.lat), parseFloat(position.lng));
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
        this.checkLog += "GPS: "
        this.geolocation.getCurrentPosition({timeout: 5000, enableHighAccuracy:true}).then((position) => {    
            this.checkLog += position.coords.latitude + ", " + position.coords.longitude;
            return {lat: position.coords.latitude, lng: position.coords.longitude}
        }, (error) => {
            console.log(error);
            this.checkLog += "ERROR: " + error;
        });
    }     

    // ################# //
    // #### BEACONS #### //
    // ################# //
    public checkBeacons() {
        
        try {
            this.beacons = this.beaconService.getBeacons();
            /*for (let x in this.beacons) {
                str += this.beacons[x].identifier + ", ";
            }*/
            this.checkLog += "Beacons available: " + this.beacons.length + ", ";
            //console.log(str);
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
        this.tricons = [];
        this.triconsACC = [];        
        for (let i = 0; i < 3; i++) {
            let elevation;
            //console.log("B - " + i + ": " + beacons[i].identifier + "; " + beacons[i].coordinates + "; " + beacons[i].accCK);
            let latLngAlt = this.beacons[i].coordinates.split(", ");                
            this.tricons.push({lat: latLngAlt[0], lng: latLngAlt[1], distance: this.beacons[i].accCK, elevation: latLngAlt[2]});
            this.triconsACC.push({lat: latLngAlt[0], lng: latLngAlt[1], distance: this.beacons[i].acc, elevation: latLngAlt[2]});
            //console.log("T - " + i + ": " + this.tricons[i].lat + ", " + this.tricons[i].lng + ", " + this.tricons[i].distance + ", " + this.tricons[i].height);                
        }    
        let triPoint: any = this.mapService.trilaterate(this.tricons);
        //console.log("Beacon Tri Position: " + triStr);
        //let triStrACC: any = this.mapService.trilaterate(this.triconsACC);
        //console.log("Beacon Tri Position ACC: " + triStrACC);
        this.checkLog += "Beacons: " + triPoint.lat + ", " + triPoint.lng;
        this.emailLog += triPoint.lat + ", " + triPoint.lng; + "\n";
        //let splitTriPt = triPoint.split(", ");
        return {lat: triPoint.lat, lng: triPoint.lng};        
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
        if (this.polygon != null) {
            this.polygon.setMap(null);
        }  
        if (this.mapViewState == 'on') {
            this.toggleMapView();
        }
        let latLngPts = this.mapService.splitCoordinatesToLatLng(points);
        this.polygon = new google.maps.Polyline();
        this.polygon.setOptions(this.mapService.createPolylineOptions(latLngPts));
        this.polygon.setMap(this.map);
        let center = new google.maps.LatLng(latLngPts[latLngPts.length-1].lat, latLngPts[latLngPts.length-1].lng);
        this.map.panTo(center);

        let lengthInMeters = google.maps.geometry.spherical.computeLength(this.polygon.getPath());
        console.log("Polyline length: " + lengthInMeters);
    }

    public testRouting() {
        // set start and endpoint
        /* let rStart = {name: "Start", house: "Bauwesen", tier: 0, lat: 52.54567, lng: 13.35582};
        let rEnd = {name: "End", house: "Bauwesen", tier: 0, lat: 52.54548, lng: 13.35553}; */

        this.dbService.getRoutePointByName("d00Points", "E57").subscribe(data => {
            let rStart = {lng: 13.35530, lat: 52.54520};
            let rEnd = {lat: data.lat, lng: data.lng};   
            
            // ### TODO: check if start and end position is in same house and tier
            
            // ### TODO: determine routing polygon (index)
            let routingPolygonIndex = 84;
            let routingPolygon = this.polygons[routingPolygonIndex];

            let rPaths = this.routingService.createRouteInPolygon(rStart, rEnd, routingPolygon);
            let polyline = this.mapService.createPolyline(rPaths);                
            polyline.setMap(this.map);
        });

        // let rEnd = new google.maps.LatLng(52.54557, 13.35569);
        // let rEnd = new google.maps.LatLng(52.54566, 13.35552);

        // start 13.35582,52.54567
        // end1 52.54548, 13.35553
        // end3 52.54557, 13.35569
    }        

    public testGS() {
         
    }
}