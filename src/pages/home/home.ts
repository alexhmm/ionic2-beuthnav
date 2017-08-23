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

    // states
    public startState = 0;
    public listViewState = 'out';
    public infoViewState = 'out';
    public levelViewState = 'in'
    public mapViewState = 'on'

    // room data
    public roomsListView: any[] = [];
    public roomsListViewBackup: any[] = [];
    public allPoints: any[] = [];
    public attributes = {name: "", type: "", desc: "", position: "", building: "", level: ""};

    // map elements
    public polygons: any[] = [];
    public polygonsRouting: any[] = [];
    public routingPolygons: any[] = [];
    public NEWroutingPoints: any[] = [];
    public customMarkers: any[] = [];
    public infoWindows: any[] = [];
    public routingPaths;
    public routingPathsRemain1;
    public routingPathsRemain2;
    public routingPathsRemain3;
    public routingPathsRemainAll: any[] = [];
    public marker;
    public markerRemain;
    public markerChange;
    public markerChangeRemain1;
    public markerChangeRemain2;
    public markerExit1;
    public markerExit2;
    public markerExitRemain;
    public polygon;
    public circle; 

    // beacon variables
    public beacons: any[] = [];
    public tricons: any[] = [];
    public triconsACC: any[] = [];
    
    // location variables
    public previousBuilding;
    public previousLevel;
    public currentPosition = null;
    public currentBuilding = "";    
    public currentLevel = 0;
    public currentAttr;
    public currentCoords;
    public currentPoints;

    // logging
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
            this.beaconService.setupBeacons();
            this.beaconService.startRangingBeacons();

            // Interval positioning from available methods
            setInterval(() => { 
                this.checkLog = "";
                this.checkBeacons();
                if (this.mapViewState == 'on') {
                    this.getCurrentPosition();
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
        console.log("Initialize ListView.")  
        this.dbService.getRoomsListView().subscribe(data => {
            this.roomsListView = data;
            this.roomsListViewBackup = this.roomsListView;
            console.log("ListView loaded: " + this.roomsListViewBackup.length);
        });
        
    }

    /**
     * Loads polygon data on google map
     * @param floor 
     */
    public loadMap() { 
        console.log("Load map styles.");

        this.map = new google.maps.Map(this.mapelement.nativeElement, this.mapService.getMapOptions());

        // Zoom changed listener
        google.maps.event.addListener(this.map, 'zoom_changed', () => {
            if (this.circle != null) this.circle.setRadius(this.mapService.getCircleRadius(this.getMapZoom()));      
            if (this.marker != null) this.marker.setIcon(this.mapService.getCustomMarkerIcon(this.marker.getIcon().url, this.mapService.getRouteMarkerSize(this.getMapZoom())));
            for (let x in this.customMarkers) {                    
                this.customMarkers[x].setIcon(this.mapService.getCustomMarkerIcon(this.customMarkers[x].getIcon().url, this.mapService.getCustomMarkerSize(this.getMapZoom())));
            }
        });

        google.maps.event.addListener(this.map, 'click', (event) => {
            console.log("Click on map: " + event.latLng);
        })

        // reset map elements
        if (this.polygons != null) {
            for (let x in this.polygons) this.polygons[x].setMap(null);
            this.polygons = [];
        }
        if (this.polygonsRouting != null) {
            for (let x in this.polygonsRouting) this.polygonsRouting[x].polygon.setMap(null);
            this.polygonsRouting = [];
        }
        if (this.customMarkers != null) {
            for (let x in this.customMarkers) this.customMarkers[x].setMap(null);
            this.customMarkers = [];
        }

        if (this.currentAttr != null && this.currentLevel != null) {   
            // SQLite Code with Observable    
            this.dbService.getCurrentAttrCoords(this.currentAttr, this.currentCoords).subscribe(data => {
                console.log("Loading map polygons.");
                for (let x in data) {
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

                    if (room.routing == "true") this.polygonsRouting.push({shapeid: room.shapeid, name: room.name, polygon: polygon});

                    if (room.type == "lab" || room.type == "lecture" || room.type == "office" || room.type == "service" || room.type == "mensa") {
                        google.maps.event.addListener(polygon, 'click', (event) => {
                            let attributes = {shapeid: room.shapeid, name: room.name, desc: room.desc, building: this.currentBuilding, level: this.currentLevel};
                            console.log("LatLng: " + event.latLng);
                            this.selectRoom(attributes);
                        })
                    }

                    if (room.type == "wc" || room.type == "staircase" || room.type == "lift" || room.type == "cafe" || room.type == "lib") {
                        let roomCentroid = this.mapService.getPolygonCentroid(paths);
                        let position = new google.maps.LatLng(parseFloat(roomCentroid.lat), parseFloat(roomCentroid.lng));   
                        let customMarker = this.mapService.getIconForCustomMarker(room.type, paths);
                        customMarker.setMap(this.map);
                        this.customMarkers.push(customMarker); 
                        google.maps.event.addListener(customMarker, 'click', (event) => {
                            let attributes = {shapeid: room.shapeid, name: room.name, desc: room.desc, building: this.currentBuilding, level: this.currentLevel};
                            this.selectRoom(attributes);
                        })
                    }                    
                }   
                console.log("Polygons loaded: " + this.polygons.length + ", Custom markers: " + this.customMarkers.length);
            })  

            this.dbService.getAllBuildingsAttrCoords(this.currentBuilding).subscribe(data => {
                console.log("Loading map buildings.");

                if (this.infoWindows != null) {
                    for (let x in this.infoWindows) this.infoWindows[x].setMap(null);
                    this.infoWindows = [];
                }

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

                    /* google.maps.event.addListener(polygon, 'click', (event) => {

                    }) */

                    let centroid = this.mapService.getPolygonCentroid(paths);
                    /* let infoWindow = this.mapService.createInfoWindow(centroid, building.name);
                    infoWindow.setMap(this.map);
                    infoWindow.open;
                    this.infoWindows.push(infoWindow);   */
                }

                // replace with centroid of currentBuilding
                /* let center = this.map.getCenter();
                center = new google.maps.LatLng(52.545165, 13.355360);
                this.map.panTo(center); */
            })
        }
    }   

    /**
     * Retrieves current position from beacons or gps
     */
    public getCurrentPosition() {        
        this.checkLog += "Position-"        
        if (this.beacons.length > 2) {
            this.currentPosition = this.getCurrentPositionBeacons(); 
            this.displayCurrentPosition();
            if (this.currentPosition != null) this.getCurrentBuilding();    
            console.log(this.checkLog);              
        } else {
            this.mapService.getCurrentPositionGPS().subscribe(data => {
                this.currentPosition = data;
                this.checkLog += "GPS: " + this.currentPosition.lat + ", " + this.currentPosition.lng;
                this.displayCurrentPosition();
                if (this.currentPosition != null) this.getCurrentBuilding();
                console.log(this.checkLog);
            });            
        }
    }

    /**
     * Sets current position from gps
     */
    public getCurrentPositionGPS() {
        this.checkLog += "GPS: "
        this.geolocation.getCurrentPosition({timeout: 5000, enableHighAccuracy:true}).then((position) => {    
            this.checkLog += position.coords.latitude + ", " + position.coords.longitude;
            return {lat: position.coords.latitude, lng: position.coords.longitude};
        }, (error) => {
            console.log(error);
            this.checkLog += "ERROR: " + error;
        });
    }     
    
    /**
     * Updates display of current user position
     */
    public displayCurrentPosition() {
        if (this.map != null) {
            let center = new google.maps.LatLng(this.currentPosition.lat, this.currentPosition.lng);
            if (this.circle != null) {
                this.circle.setMap(null);
            }  
            this.circle = new google.maps.Circle();
            this.circle.setOptions(this.mapService.createCircleOptions(this.currentPosition, (this.mapService.getCircleRadius(this.getMapZoom()).toFixed(4))));
            this.circle.setMap(this.map);
            // if viewStates not on
            //this.map.panTo(center); ####### ENABLE IN SCHOOL
        }
    }

    /**
     * Checks for the current displayed building by current user position
     */
    public getCurrentBuilding() {
        this.previousBuilding = this.currentBuilding;
        let buildings = this.dbService.getBuildingsCentroids();
        let currentPositionLatLng = new google.maps.LatLng(this.currentPosition.lat, this.currentPosition.lng);
        try {
            let buildingsSort = this.routingService.sortByDistance(buildings, currentPositionLatLng);
            this.currentBuilding = buildingsSort[0].name;
            this.checkLog += ", Current Building: " + this.currentBuilding;            
        } catch (e) {
            console.log("Get current building, ERROR: " + e);
            this.currentBuilding = "BauwesenD";
        } 
        //this.currentBuilding = "GaussB";        

        if (this.currentBuilding != this.previousBuilding || this.currentLevel != this.previousLevel) {
            let tables = this.dbService.getCurrentBuildingTables(this.currentBuilding, this.currentLevel);
            this.currentAttr = tables.attr;
            this.currentCoords = tables.coords;
            this.currentPoints = tables.points;
            this.loadMap();    
            this.startState = 1;   
            this.dbService.getCurrentPoints(this.currentPoints).subscribe(data => {
                this.allPoints = data;   
            });   
        }
        this.previousLevel = this.currentLevel;
    }

    /**
     * Changes the current level on google map
     * @param direction 
     */
    public changeCurrentLevel(building: any, direction: any) {
        let buildingLevels = this.dbService.getBuildingLevels(this.currentBuilding);
        this.currentLevel = this.mapService.changeCurrentLevel(this.currentLevel, buildingLevels, direction);
        this.getCurrentBuilding();
    }

    public cleanPolygons(polygons: any) {
        console.log("Clean polygons.");
        if (polygons != null) {
            for (let x in polygons) polygons[x].polygon.setMap(null);
            return polygons = [];            
        }
    }

    /**
     * Returns current zoom of google map
     */
    public getMapZoom() {
        return this.map.getZoom();
    }

    /**
     * Filters ListView of all rooms
     * @param event 
     */
    public getRoomListView(event: any) {
        if (this.infoViewState == 'in') {
                this.toggleInfoView();
        }   
        this.roomsListView = this.roomsListViewBackup;

        let value = event.target.value;

        if (value && value.trim() != '') {    
            this.roomsListView = this.roomsListView.filter((room) => {
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
     * Selects room for routing and creates route marker
     * @param room 
     */
    public selectRoom(room: any) {
        this.dbService.getRoomCoordinates(room.shapeid, room.building, room.level).subscribe(data => {
            let roomCentroid = this.mapService.getPolygonCentroid(data);
            let position = new google.maps.LatLng(parseFloat(roomCentroid.lat), parseFloat(roomCentroid.lng)); 

            this.attributes.name = room.name;
            this.attributes.desc = room.desc;
            this.attributes.building = room.building;
            this.attributes.level = room.level;
            this.attributes.position = roomCentroid;

            if (this.marker != null) {
                this.marker.setMap(null);
            }           
            
            this.marker = this.mapService.createRouteMarker(position, "./assets/icon/marker.png", 48);
            this.marker.setMap(this.map);

            // this.map.panTo(position); // BUG: Uncaught RangeError: Maximum call stack size exceeded
            
            if (this.listViewState == 'in') this.toggleListView();
            if (this.infoViewState == 'out') this.toggleInfoView();
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

    /**
     * Starts to search for beacons in range
     */
    public startRangingBeacons() {
        this.beaconService.startRangingBeacons();  
    }

    /**
     * Sets current position from beacons
     */
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
        if (this.infoViewState == 'in') this.toggleInfoView();
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


    // ######################### \\
    // ######## ROUTING ######## \\
    // ######################### \\    
    public startRouting(endName: String, endBuilding: String, endLevel: number, endPosition: any) {
        console.log("Start routing algorithm: " + endName + ", " + endBuilding + ", " + endLevel);
        let currentPosition = this.currentPosition;
        let currentPositionLatLng = new google.maps.LatLng(currentPosition.lat, currentPosition.lng);
        let endPositionLatLng = new google.maps.LatLng(endPosition.lat, endPosition.lng);
        // let currentPosition = {lng: 13.35537, lat: 52.54572}; // oben rechts
        //let currentPosition = {lng: 13.35417, lat: 52.54486};  // unten links 1. og
        let rPaths; // paths for routing polyline

        // ####### NEW
        if (this.routingPolygons != null) this.routingPolygons = this.cleanPolygons(this.routingPolygons);
        if (this.routingPaths != null) this.routingPaths.setMap(null);
        if (this.routingPathsRemain1 != null) this.routingPathsRemain1.setMap(null);
        if (this.routingPathsRemain2 != null) this.routingPathsRemain2.setMap(null);
        if (this.routingPathsRemain3 != null) this.routingPathsRemain3.setMap(null);
        if (this.marker != null) this.marker.setMap(null);
        if (this.markerRemain != null) this.markerRemain.setMap(null);
        if (this.markerChange != null) this.markerChange.setMap(null);
        if (this.markerChangeRemain1 != null) this.markerChangeRemain1.setMap(null);
        if (this.markerChangeRemain2 != null) this.markerChangeRemain2.setMap(null);
        if (this.markerExit1 != null) this.markerExit1.setMap(null);
        if (this.markerExit2 != null) this.markerExit2.setMap(null);
        if (this.markerExitRemain != null) this.markerExitRemain.setMap(null);

        // ###### temporary
        // let endName = "D 110";
        
        let tempName;
        // ################

        // Routing through multiple levels
        // 0    EndBuilding == CurrentBuilding && EndLevel == CurrentLevel
        if (endBuilding == this.currentBuilding && endLevel == this.currentLevel) { 
            this.dbService.getRoutingPolygonsPoints(this.currentBuilding, this.currentLevel).subscribe(data => {    
                let routingPolygonsRaw = data[0];
                let routingPoints = data[1];                

                this.routingPolygons = this.routingService.getRoutePolygonsLatLngCoordinates(routingPolygonsRaw);                
                for (let x in this.routingPolygons) this.routingPolygons[x].polygon.setMap(this.map);

                let rStartSBSL = this.routingService.getRouteStart(currentPosition, this.routingPolygons, routingPoints);
                let rEndSBSL = this.routingService.getRoutePointByName(routingPoints, endName);
                
                rPaths = this.routingService.createRouteInLevel(rStartSBSL, rEndSBSL, this.routingPolygons, routingPoints); 
                this.routingPaths = this.mapService.createRoutePolyline(rPaths);                
                this.routingPaths.setMap(this.map);

                let end = new google.maps.LatLng(rEndSBSL.lat, rEndSBSL.lng);
                this.marker = this.mapService.createRouteMarker(end, "./assets/icon/marker.png", 48);
                this.marker.setMap(this.map);
            });    

        // 1    EndBuilding == CurrentBuilding && EndLevel != CurrentLevel
        } else if (endBuilding == this.currentBuilding && endLevel != this.currentLevel) {
            console.log("1: endBuilding: " + endBuilding + " == this.currentBuilding: " + this.currentBuilding + " && endLevel: " + endLevel + " != this.currentLevel: " + this.currentLevel);  

            // start building, start level
            this.dbService.getRoutingPolygonsPoints(this.currentBuilding, this.currentLevel).subscribe(data => {    
                let routingPolygonsRawSBSL = data[0];
                let routingPointsSBSL = data[1];

                this.routingPolygons = this.routingService.getRoutePolygonsLatLngCoordinates(routingPolygonsRawSBSL);                
                for (let x in this.routingPolygons) this.routingPolygons[x].polygon.setMap(this.map);

                let rStartSBSL = this.routingService.getRouteStart(currentPosition, this.routingPolygons, routingPointsSBSL);
                let rEndSBSL = this.routingService.getRoutePointByType(routingPointsSBSL, "staircase", currentPositionLatLng);

                rPaths = this.routingService.createRouteInLevel(rStartSBSL, rEndSBSL, this.routingPolygons, routingPointsSBSL); 
                this.routingPaths = this.mapService.createRoutePolyline(rPaths);                
                this.routingPaths.setMap(this.map);

                let end = new google.maps.LatLng(rEndSBSL.lat, rEndSBSL.lng);
                this.markerChange = this.mapService.createRouteMarker(end, "./assets/icon/markerChange.png", 48);
                this.markerChange.setMap(this.map);

                // start building, end level
                this.dbService.getRoutingPolygonsPoints(this.currentBuilding, endLevel).subscribe(dataEL => {        
                    let routingPolygonsRawSBEL = dataEL[0];
                    let routingPointsSBEL = dataEL[1];

                    this.routingPolygons = this.cleanPolygons(this.routingPolygons);  
                    this.routingPolygons = this.routingService.getRoutePolygonsLatLngCoordinates(routingPolygonsRawSBEL);                
                    for (let x in this.routingPolygons) this.routingPolygons[x].polygon.setMap(this.map);  
                    
                    let rStartSBEL = this.routingService.getRoutePointByRouteId(routingPointsSBEL, rEndSBSL.routing);
                    let rEndSBEL = this.routingService.getRoutePointByName(routingPointsSBEL, endName);

                    rPaths = this.routingService.createRouteInLevel(rStartSBEL, rEndSBEL, this.routingPolygons, routingPointsSBEL); 
                    this.routingPathsRemain1 = this.mapService.createRoutePolylineRemain(rPaths);                
                    this.routingPathsRemain1.setMap(this.map);

                    let end = new google.maps.LatLng(rEndSBEL.lat, rEndSBEL.lng);
                    this.markerRemain = this.mapService.createRouteMarkerRemain(end, "./assets/icon/marker.png", 48);
                    this.markerRemain.setMap(this.map);
                });
            });

            // if tempEnd distance to currentPosition is < 1m getCurrentBuilding(currentBuilding, endLevel);



        // 2    EndBuilding != CurrentBuilding
        } else if (endBuilding != this.currentBuilding) {
            console.log("2: endBuilding: " + endBuilding + " != this.currentBuilding: ");   

            if (this.currentLevel == 0) {
                
                // start building, level 0
                console.log("2: start building, start level.");
                this.dbService.getRoutingPolygonsPoints(this.currentBuilding, 0).subscribe(dataSBSL => {        
                    let routingPolygonsRawSBSL = dataSBSL[0];
                    let routingPointsSBSL = dataSBSL[1];

                    this.routingPolygons = this.cleanPolygons(this.routingPolygons);  
                    this.routingPolygons = this.routingService.getRoutePolygonsLatLngCoordinates(routingPolygonsRawSBSL);                
                    for (let x in this.routingPolygons) this.routingPolygons[x].polygon.setMap(this.map);  
                    
                    let rStartSBSL = this.routingService.getRouteStart(currentPosition, this.routingPolygons, routingPointsSBSL);
                    let rEndSBSL = this.routingService.getRoutePointByType(routingPointsSBSL, "exit", endPositionLatLng);

                    rPaths = this.routingService.createRouteInLevel(rStartSBSL, rEndSBSL, this.routingPolygons, routingPointsSBSL); 
                    this.routingPaths = this.mapService.createRoutePolyline(rPaths);                
                    this.routingPaths.setMap(this.map);

                    let end = new google.maps.LatLng(rEndSBSL.lat, rEndSBSL.lng);
                    this.markerExit1 = this.mapService.createRouteMarker(end, "./assets/icon/markerExit.png", 48);
                    this.markerExit1.setMap(this.map);

                    if (endLevel == 0) {
                        // end building, start level
                        console.log("2: end building, start level.");
                        this.dbService.getRoutingPolygonsPoints(endBuilding, 0).subscribe(dataEBSL => {    
                            let routingPolygonsRawEBSL = dataEBSL[0];
                            let routingPointsEBSL = dataEBSL[1];
            
                            this.routingPolygons = this.cleanPolygons(this.routingPolygons);  
                            this.routingPolygons = this.routingService.getRoutePolygonsLatLngCoordinates(routingPolygonsRawEBSL);                
                            for (let x in this.routingPolygons) this.routingPolygons[x].polygon.setMap(this.map);
            
                            let positionExit = new google.maps.LatLng(parseFloat(rEndSBSL.lat), parseFloat(rEndSBSL.lng));
                            let rStartEBSL = this.routingService.getRoutePointByExit(routingPointsEBSL, positionExit);
                            
                            let rEndEBSL = this.routingService.getRoutePointByName(routingPointsEBSL, endName);
            
                            rPaths = this.routingService.createRouteInLevel(rStartEBSL, rEndEBSL, this.routingPolygons, routingPointsEBSL); 
                            this.routingPathsRemain2 = this.mapService.createRoutePolylineRemain(rPaths);                
                            this.routingPathsRemain2.setMap(this.map);

                            let start = new google.maps.LatLng(parseFloat(rStartEBSL.lat), parseFloat(rStartEBSL.lng));
                            this.markerExit2 = this.mapService.createRouteMarker(start, "./assets/icon/markerExit.png", 48);
                            this.markerExit2.setMap(this.map);
            
                            let end = new google.maps.LatLng(rEndEBSL.lat, rEndEBSL.lng);
                            this.markerRemain = this.mapService.createRouteMarkerRemain(end, "./assets/icon/marker.png", 48);
                            this.markerRemain.setMap(this.map);
                        });
                    } else {
                        // end building, start level
                        console.log("2: end building, start level.");
                        this.dbService.getRoutingPolygonsPoints(endBuilding, 0).subscribe(dataEBSL => {    
                            let routingPolygonsRawEBSL = dataEBSL[0];
                            let routingPointsEBSL = dataEBSL[1];
            
                            this.routingPolygons = this.cleanPolygons(this.routingPolygons);
                            this.routingPolygons = this.routingService.getRoutePolygonsLatLngCoordinates(routingPolygonsRawEBSL);                
                            for (let x in this.routingPolygons) this.routingPolygons[x].polygon.setMap(this.map);
            
                            let positionExit = new google.maps.LatLng(parseFloat(rEndSBSL.lat), parseFloat(rEndSBSL.lng));
                            let rStartEBSL = this.routingService.getRoutePointByExit(routingPointsEBSL, positionExit);
                            let start = new google.maps.LatLng(parseFloat(rStartEBSL.lat), parseFloat(rStartEBSL.lng));
                            let rEndEBSL = this.routingService.getRoutePointByType(routingPointsEBSL, "staircase", start);
            
                            rPaths = this.routingService.createRouteInLevel(rStartEBSL, rEndEBSL, this.routingPolygons, routingPointsEBSL); 

                            this.routingPathsRemain2 = this.mapService.createRoutePolylineRemain(rPaths);                
                            this.routingPathsRemain2.setMap(this.map);
                            
                            this.markerExit2 = this.mapService.createRouteMarker(start, "./assets/icon/markerExit.png", 48);
                            this.markerExit2.setMap(this.map);
            
                            let end = new google.maps.LatLng(rEndEBSL.lat, rEndEBSL.lng);
                            this.markerChangeRemain2 = this.mapService.createRouteMarkerRemain(end, "./assets/icon/markerChange.png", 48);
                            this.markerChangeRemain2.setMap(this.map);

                            // end building, end level
                            console.log("2: end building, end level.");
                            this.dbService.getRoutingPolygonsPoints(endBuilding, endLevel).subscribe(dataEBEL => {        
                                let routingPolygonsRawEBEL = dataEBEL[0];
                                let routingPointsEBEL = dataEBEL[1];
            
                                this.routingPolygons = this.cleanPolygons(this.routingPolygons);  
                                this.routingPolygons = this.routingService.getRoutePolygonsLatLngCoordinates(routingPolygonsRawEBEL);                
                                for (let x in this.routingPolygons) this.routingPolygons[x].polygon.setMap(this.map);  
                                
                                let rStartEBEL = this.routingService.getRoutePointByRouteId(routingPointsEBEL, rEndEBSL.routing);
                                let rEndEBEL = this.routingService.getRoutePointByName(routingPointsEBEL, endName);
            
                                rPaths = this.routingService.createRouteInLevel(rStartEBEL, rEndEBEL, this.routingPolygons, routingPointsEBEL); 
                                this.routingPathsRemain3 = this.mapService.createRoutePolylineRemain(rPaths);                
                                this.routingPathsRemain3.setMap(this.map);
            
                                let end = new google.maps.LatLng(rEndEBEL.lat, rEndEBEL.lng);
                                this.markerRemain = this.mapService.createRouteMarkerRemain(end, "./assets/icon/marker.png", 48);
                                this.markerRemain.setMap(this.map);
                            });   
                        });
                    }
                });



                
            } else {
                // start building, start level
                console.log("2: start building, start level.");
                this.dbService.getRoutingPolygonsPoints(this.currentBuilding, this.currentLevel).subscribe(dataSBSL => {    
                    let routingPolygonsRawSBSL = dataSBSL[0];
                    let routingPointsSBSL = dataSBSL[1];
    
                    this.routingPolygons = this.routingService.getRoutePolygonsLatLngCoordinates(routingPolygonsRawSBSL);                
                    for (let x in this.routingPolygons) this.routingPolygons[x].polygon.setMap(this.map);
    
                    let rStartSBSL = this.routingService.getRouteStart(currentPosition, this.routingPolygons, routingPointsSBSL);
                    let rEndSBSL = this.routingService.getRoutePointByType(routingPointsSBSL, "staircase", currentPositionLatLng);
    
                    rPaths = this.routingService.createRouteInLevel(rStartSBSL, rEndSBSL, this.routingPolygons, routingPointsSBSL); 
                    this.routingPaths = this.mapService.createRoutePolyline(rPaths);                
                    this.routingPaths.setMap(this.map);
    
                    let end = new google.maps.LatLng(rEndSBSL.lat, rEndSBSL.lng);
                    this.markerChange = this.mapService.createRouteMarker(end, "./assets/icon/markerChange.png", 48);
                    this.markerChange.setMap(this.map);

                    // start building, level 0
                    console.log("2: start building, end level.");
                    this.dbService.getRoutingPolygonsPoints(this.currentBuilding, 0).subscribe(dataSBSL => {        
                        let routingPolygonsRawSBEL = dataSBSL[0];
                        let routingPointsSBEL = dataSBSL[1];
    
                        this.routingPolygons = this.cleanPolygons(this.routingPolygons);  
                        this.routingPolygons = this.routingService.getRoutePolygonsLatLngCoordinates(routingPolygonsRawSBEL);                
                        for (let x in this.routingPolygons) this.routingPolygons[x].polygon.setMap(this.map);  
                        
                        let rStartSBEL = this.routingService.getRoutePointByRouteId(routingPointsSBEL, rEndSBSL.routing);
                        let rEndSBEL = this.routingService.getRoutePointByType(routingPointsSBEL, "exit", endPositionLatLng);
    
                        rPaths = this.routingService.createRouteInLevel(rStartSBEL, rEndSBEL, this.routingPolygons, routingPointsSBEL); 
                        this.routingPathsRemain1 = this.mapService.createRoutePolylineRemain(rPaths);                
                        this.routingPathsRemain1.setMap(this.map);
    
                        let end = new google.maps.LatLng(rEndSBEL.lat, rEndSBEL.lng);
                        this.markerExitRemain = this.mapService.createRouteMarkerRemain(end, "./assets/icon/markerExit.png", 48);
                        this.markerExitRemain.setMap(this.map);

                        if (endLevel == 0) {
                            // end building, start level
                            console.log("2: end building, start level.");
                            this.dbService.getRoutingPolygonsPoints(endBuilding, 0).subscribe(dataEBSL => {    
                                let routingPolygonsRawEBSL = dataEBSL[0];
                                let routingPointsEBSL = dataEBSL[1];
                
                                this.routingPolygons = this.cleanPolygons(this.routingPolygons);  
                                this.routingPolygons = this.routingService.getRoutePolygonsLatLngCoordinates(routingPolygonsRawEBSL);                
                                for (let x in this.routingPolygons) this.routingPolygons[x].polygon.setMap(this.map);
                
                                let positionExit = new google.maps.LatLng(parseFloat(rEndSBEL.lat), parseFloat(rEndSBEL.lng));
                                let rStartEBSL = this.routingService.getRoutePointByExit(routingPointsEBSL, positionExit);
                                
                                let rEndEBSL = this.routingService.getRoutePointByName(routingPointsEBSL, endName);
                
                                rPaths = this.routingService.createRouteInLevel(rStartEBSL, rEndEBSL, this.routingPolygons, routingPointsEBSL); 
                                this.routingPathsRemain2 = this.mapService.createRoutePolylineRemain(rPaths);                
                                this.routingPathsRemain2.setMap(this.map);

                                let start = new google.maps.LatLng(parseFloat(rStartEBSL.lat), parseFloat(rStartEBSL.lng));
                                this.markerExit2 = this.mapService.createRouteMarker(start, "./assets/icon/markerExit.png", 48);
                                this.markerExit2.setMap(this.map);
                
                                let end = new google.maps.LatLng(rEndEBSL.lat, rEndEBSL.lng);
                                this.markerRemain = this.mapService.createRouteMarkerRemain(end, "./assets/icon/marker.png", 48);
                                this.markerRemain.setMap(this.map);
                            });
                        } else {
                            // end building, start level
                            console.log("2: end building, start level.");
                            this.dbService.getRoutingPolygonsPoints(endBuilding, 0).subscribe(dataEBSL => {    
                                let routingPolygonsRawEBSL = dataEBSL[0];
                                let routingPointsEBSL = dataEBSL[1];
                
                                this.routingPolygons = this.cleanPolygons(this.routingPolygons);
                                this.routingPolygons = this.routingService.getRoutePolygonsLatLngCoordinates(routingPolygonsRawEBSL);                
                                for (let x in this.routingPolygons) this.routingPolygons[x].polygon.setMap(this.map);
                
                                let positionExit = new google.maps.LatLng(parseFloat(rEndSBEL.lat), parseFloat(rEndSBEL.lng));
                                let rStartEBSL = this.routingService.getRoutePointByExit(routingPointsEBSL, positionExit);
                                let start = new google.maps.LatLng(parseFloat(rStartEBSL.lat), parseFloat(rStartEBSL.lng));
                                let rEndEBSL = this.routingService.getRoutePointByType(routingPointsEBSL, "staircase", start);
                
                                rPaths = this.routingService.createRouteInLevel(rStartEBSL, rEndEBSL, this.routingPolygons, routingPointsEBSL); 

                                this.routingPathsRemain2 = this.mapService.createRoutePolylineRemain(rPaths);                
                                this.routingPathsRemain2.setMap(this.map);
                                
                                this.markerExit2 = this.mapService.createRouteMarker(start, "./assets/icon/markerExit.png", 48);
                                this.markerExit2.setMap(this.map);
                
                                let end = new google.maps.LatLng(rEndEBSL.lat, rEndEBSL.lng);
                                this.markerChangeRemain2 = this.mapService.createRouteMarkerRemain(end, "./assets/icon/markerChange.png", 48);
                                this.markerChangeRemain2.setMap(this.map);

                                // end building, end level
                                console.log("2: end building, end level.");
                                this.dbService.getRoutingPolygonsPoints(endBuilding, endLevel).subscribe(dataEBEL => {        
                                    let routingPolygonsRawEBEL = dataEBEL[0];
                                    let routingPointsEBEL = dataEBEL[1];
                
                                    this.routingPolygons = this.cleanPolygons(this.routingPolygons);  
                                    this.routingPolygons = this.routingService.getRoutePolygonsLatLngCoordinates(routingPolygonsRawEBEL);                
                                    for (let x in this.routingPolygons) this.routingPolygons[x].polygon.setMap(this.map);  
                                    
                                    let rStartEBEL = this.routingService.getRoutePointByRouteId(routingPointsEBEL, rEndEBSL.routing);
                                    let rEndEBEL = this.routingService.getRoutePointByName(routingPointsEBEL, endName);
                
                                    rPaths = this.routingService.createRouteInLevel(rStartEBEL, rEndEBEL, this.routingPolygons, routingPointsEBEL); 
                                    this.routingPathsRemain3 = this.mapService.createRoutePolylineRemain(rPaths);                
                                    this.routingPathsRemain3.setMap(this.map);
                
                                    let end = new google.maps.LatLng(rEndEBEL.lat, rEndEBEL.lng);
                                    this.markerRemain = this.mapService.createRouteMarkerRemain(end, "./assets/icon/marker.png", 48);
                                    this.markerRemain.setMap(this.map);
                                });   
                            });
                        }
                    });
                });

                // if tempEnd distance to currentPosition is < 1m getCurrentBuilding(currentBuilding, level 0);
                // set nearest neighbor (shortest distance) of (new loaded) allPoints
                // route to exit in same level
            }   
        }             
    }

    public testGS() {

    }
}