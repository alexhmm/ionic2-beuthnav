import { Component, ViewChild, ElementRef } from '@angular/core';
import { AlertController } from 'ionic-angular';
import { NavController, Platform } from 'ionic-angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { trigger, state, transition, style, animate } from '@angular/animations';

import { BeaconService } from '../../services/beaconservice';
import { DatabaseService } from '../../services/databaseservice';
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
    public routeState = 'off';
    public listViewState = 'out';
    public infoViewState = 'out';
    public levelViewState = 'in';
    public mapViewState = 'on';
    public testState = 'off';
    public positionState = 'on';

    // room data
    public roomsListView: any[] = [];
    public roomsListViewBackup: any[] = [];
    public allPoints: any[] = [];
    public attributes = {name: "", type: "", desc: "", position: "", building: "", level: ""};

    // map elements
    public marker;
    public polygon;
    public positionMarker; 

    public polygons: any[] = [];
    public routingPolygons: any[] = [];
    public roomMarkers: any[] = [];
    public markersLevel: any[] = [];
    public markersRemain: any[] = [];
    public markersPathsLevel: any[] = [];
    public markersPathsRemain: any[][] = [];
    public routingPolylineLevelPosition;
    public routingPolylineLevel;
    public routingPolylinesRemain: any[] = [];
    public routingPathsLevelPosition: any[] = [];
    public routingPathsLevel: any[] = [];
    public routingPathsRemain: any[][] = [];
    public routingLevels: any[][] = [];

    public routingPaths;
    public routingPathsRemain1;
    public routingPathsRemain2;
    public routingPathsRemain3;
    public routingPathsRemainAll: any[] = [];
    
    // test
    public markerRemain;
    public markerChange;
    public markerChangeRemain1;
    public markerChangeRemain2;
    public markerExit1;
    public markerExit2;
    public markerExitRemain;    

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

    // device orientation variables
    public direction;
    public directionValues: any[] = [];

    // logging
    public checkLog;

    constructor(public alertCtrl: AlertController,
                public navCtrl: NavController,
                public platform: Platform,
                public beaconService: BeaconService,                
                public dbService: DatabaseService,
                public mapService: MapService,
                public motionService: MotionService,
                public routingService: RoutingService) {    
        this.initializeRoomListView();        
    }

    ionViewDidLoad() {
        this.platform.ready().then(() => {   
            this.currentPosition = {lng: 13.35536653536712, lat: 52.54527924438224};

            this.beaconService.setupBeacons();
            this.beaconService.startRangingBeacons();

            // Interval positioning from available methods
            setInterval(() => { 
                this.checkLog = "";
                this.checkBeacons();
                if (this.mapViewState == 'on') this.getCurrentPosition();
                if (this.routeState == 'on') this.updateRoute();
             }, 3000);            
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

        this.map = new google.maps.Map(this.mapelement.nativeElement, this.mapService.getMapOptions(this.currentPosition));

        // Zoom changed listener
        google.maps.event.addListener(this.map, 'zoom_changed', () => {
            if (this.positionMarker != null) this.positionMarker.setIcon(this.positionMarker.getIcon().url, this.mapService.getCustomMarkerSize(this.getMapZoom()));
            if (this.marker != null) this.marker.setIcon(this.mapService.getCustomMarkerIcon(this.marker.getIcon().url, this.mapService.getRouteMarkerSize(this.getMapZoom())));
            for (let x in this.roomMarkers) {                    
                this.roomMarkers[x].setIcon(this.mapService.getCustomMarkerIcon(this.roomMarkers[x].getIcon().url, this.mapService.getCustomMarkerSize(this.getMapZoom())));
            }
        });

        google.maps.event.addListener(this.map, 'click', (event) => {
            console.log("Click on map: " + event.latLng);
            if (this.infoViewState = 'in') this.toggleInfoView();
        })

        // reset map elements
        if (this.polygons != null) {
            for (let x in this.polygons) this.polygons[x].setMap(null);
            this.polygons = [];
        }
        if (this.roomMarkers != null) {
            for (let x in this.roomMarkers) this.roomMarkers[x].setMap(null);
            this.roomMarkers = [];
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

                    let polygon = this.mapService.createPolygonRoomOptions(paths, room.type);
                    polygon.setMap(this.map);

                    this.polygons.push(polygon);

                    if (room.type == "lab" || room.type == "lecture" || room.type == "office" || room.type == "service" || room.type == "mensa" || room.type == "lib") {
                        google.maps.event.addListener(polygon, 'click', (event) => {
                            let attributes = {shapeid: room.shapeid, name: room.name, desc: room.desc, building: this.currentBuilding, level: this.currentLevel};
                            this.selectRoom(attributes);
                        })
                    }

                    if (room.type == "floor") {
                        google.maps.event.addListener(polygon, 'click', (event) => {
                            this.currentPosition = {lat: event.latLng.lat(), lng: event.latLng.lng()};
                        })
                    }        

                    if (room.type == "wc" || room.type == "staircase" || room.type == "lift" || room.type == "cafe" || room.type == "lib") {
                        let customMarker = this.mapService.getIconForCustomMarker(room.type, paths);
                        customMarker.setMap(this.map);
                        this.roomMarkers.push(customMarker); 
                        google.maps.event.addListener(customMarker, 'click', (event) => {
                            let attributes = {shapeid: room.shapeid, name: room.name, desc: room.desc, building: this.currentBuilding, level: this.currentLevel};
                            this.selectRoom(attributes);
                        })
                    }                    
                }   
                console.log("Polygons loaded: " + this.polygons.length + ", Custom markers: " + this.roomMarkers.length);

                this.dbService.getAllBuildingsAttrCoords(this.currentBuilding).subscribe(data => {
                    console.log("Loading map buildings.");
                    let building: any = {};                
                    for (let x in data) {
                        let paths: any[] = [];
    
                        building = data[x];
    
                        let allCoordinates = building.coordinates;
                        let coordinates: String[] = allCoordinates.split(";");
    
                        paths = this.mapService.splitCoordinatesToLatLng(coordinates);                    
    
                        let polygon = this.mapService.createPolygonBuildingOptions(paths);
                        polygon.setMap(this.map);

                        google.maps.event.addListener(polygon, 'click', (event) => {
                            this.currentPosition = {lat: event.latLng.lat(), lng: event.latLng.lng()};
                        })
                    }
                })
            })              
        }
    }   

    /**
     * Retrieves current position from beacons or gps
     */
    public getCurrentPosition() {        
        this.checkLog += "Position-"   
        this.displayCurrentPosition();    
        if (this.currentPosition != null) this.getCurrentBuilding();
        if (this.positionState == 'on') {
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
    }
    
    /**
     * Updates display of current user position
     */
    public displayCurrentPosition() {
        if (this.map != null) {
            let center = new google.maps.LatLng(this.currentPosition.lat, this.currentPosition.lng);
            if (this.positionMarker != null) this.positionMarker.setMap(null);  
            this.positionMarker = this.mapService.createCustomMarker(this.currentPosition, "./assets/icon/position.png", 16);            
            this.positionMarker.setMap(this.map);
            // if viewStates not on
            //this.map.panTo(center); // ####### ENABLE IN SCHOOL // BUGGED?
        }
    }

    /**
     * Checks for the current displayed building by current user position
     */
    public getCurrentBuilding() {
        this.previousBuilding = this.currentBuilding;
        let buildings = this.dbService.getBuildingsCentroids();
        let positionLatLng = new google.maps.LatLng(this.currentPosition.lat, this.currentPosition.lng);
        try {
            let buildingsSort = this.routingService.sortByDistance(buildings, positionLatLng);
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
        if (this.testState == 'on') {
            let markersPathsRemain = this.markersPathsRemain[0];       
            for (let x in markersPathsRemain) {  
                let marker = this.mapService.createRouteMarker(markersPathsRemain[x].position, markersPathsRemain[x].url, 48);
                marker.setMap(this.map);
                this.markersLevel.push(marker);
            } 
        }
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

            this.cleanRouteElements();

            if (this.marker != null) {
                this.marker.setMap(null);
            }   
            this.marker = this.mapService.createRouteMarker(position, "./assets/icon/marker.png", 48);
            this.marker.setMap(this.map);

            this.map.panTo(position); // BUG: Uncaught RangeError: Maximum call stack size exceeded
            
            if (this.listViewState == 'in') this.toggleListView();
            if (this.infoViewState == 'out') this.toggleInfoView();
            //if (this.routeState == 'on') this.routeState = 'off'; clean elements
                        
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
        this.tricons = [];
        this.triconsACC = [];        
        for (let i = 0; i < 3; i++) {
            let latLngAlt = this.beacons[i].coordinates.split(", ");                
            this.tricons.push({lat: latLngAlt[0], lng: latLngAlt[1], distance: this.beacons[i].accCK, elevation: latLngAlt[2]});
            this.triconsACC.push({lat: latLngAlt[0], lng: latLngAlt[1], distance: this.beacons[i].acc, elevation: latLngAlt[2]});             
        }    
        let triPoint: any = this.routingService.trilaterate(this.tricons);
        this.checkLog += "Beacons: " + triPoint.lat + ", " + triPoint.lng;
        return {lat: triPoint.lat, lng: triPoint.lng};        
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
        this.routeState = 'on';
        if (this.infoViewState = 'in') this.toggleInfoView();
        if (this.marker != null) this.marker.setMap(null);

        // Routing through multiple levels
        // 0    EndBuilding == CurrentBuilding && EndLevel == CurrentLevel
        if (endBuilding == this.currentBuilding && endLevel == this.currentLevel) { 
            this.dbService.getRoutingPolygonsPoints(this.currentBuilding, this.currentLevel).subscribe(data => {    
                let routingPolygonsRawSBSL = data[0];
                let routingPointsSBSL = data[1];                

                this.routingPolygons = this.routingService.getRoutePolygonsLatLngCoordinates(routingPolygonsRawSBSL);                
                for (let x in this.routingPolygons) this.routingPolygons[x].polygon.setMap(this.map);

                let rStartSBSL = this.routingService.getRouteStart(currentPosition, this.routingPolygons, routingPointsSBSL);
                let rEndSBSL = this.routingService.getRoutePointByName(routingPointsSBSL, endName);

                this.routingPathsLevel = this.routingService.createRouteInLevel(rStartSBSL, rEndSBSL, this.routingPolygons, routingPointsSBSL); 
                this.routingPathsLevel.splice(0, 1); // removes current position for update, temporary
                let polyline = this.mapService.createRoutePolyline(this.routingPathsLevel);                
                polyline.setMap(this.map);                
                this.routingPolylineLevel = polyline;    

                let end = new google.maps.LatLng(rEndSBSL.lat, rEndSBSL.lng);
                let url = "./assets/icon/marker.png";
                let marker = this.mapService.createRouteMarker(end, url, 48);
                marker.setMap(this.map); 
                this.markersLevel.push(marker);
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

                this.routingPathsLevel = this.routingService.createRouteInLevel(rStartSBSL, rEndSBSL, this.routingPolygons, routingPointsSBSL); 
                this.routingPathsLevel.splice(0, 1); // removes current position for update, temporary
                let polyline = this.mapService.createRoutePolyline(this.routingPathsLevel);                
                polyline.setMap(this.map);                
                this.routingPolylineLevel = polyline;     

                let end = new google.maps.LatLng(rEndSBSL.lat, rEndSBSL.lng);
                let url = "./assets/icon/markerChange.png";
                let marker = this.mapService.createRouteMarker(end, url, 48);
                marker.setMap(this.map);
                this.markersLevel.push(marker);

                // start building, end level
                this.dbService.getRoutingPolygonsPoints(this.currentBuilding, endLevel).subscribe(dataEL => {        
                    let routingPolygonsRawSBEL = dataEL[0];
                    let routingPointsSBEL = dataEL[1];

                    this.routingPolygons = this.cleanPolygons(this.routingPolygons);  
                    this.routingPolygons = this.routingService.getRoutePolygonsLatLngCoordinates(routingPolygonsRawSBEL);                
                    for (let x in this.routingPolygons) this.routingPolygons[x].polygon.setMap(this.map);  
                    
                    let rStartSBEL = this.routingService.getRoutePointByRouteId(routingPointsSBEL, rEndSBSL.routing);
                    let rEndSBEL = this.routingService.getRoutePointByName(routingPointsSBEL, endName);

                    let rPaths = this.routingService.createRouteInLevel(rStartSBEL, rEndSBEL, this.routingPolygons, routingPointsSBEL);                     
                    let polyline = this.mapService.createRoutePolylineRemain(rPaths);                
                    polyline.setMap(this.map);     
                    this.routingPathsRemain.push(rPaths);   
                    this.routingPolylinesRemain.push(polyline);
    
                    let end = new google.maps.LatLng(rEndSBEL.lat, rEndSBEL.lng);
                    let url = "./assets/icon/marker.png";
                    let marker = this.mapService.createRouteMarkerRemain(end, url, 48);
                    marker.setMap(this.map);                    
                    this.markersRemain.push([marker]);                     
                    this.markersPathsRemain.push([{position: end, url: url}]);                    

                    this.routingLevels.push([this.currentBuilding, endLevel]);
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

                    this.routingPathsLevel = this.routingService.createRouteInLevel(rStartSBSL, rEndSBSL, this.routingPolygons, routingPointsSBSL); 
                    this.routingPathsLevel.splice(0, 1); // removes current position for update, temporary
                    let polyline = this.mapService.createRoutePolyline(this.routingPathsLevel);                
                    polyline.setMap(this.map);                
                    this.routingPolylineLevel = polyline;     
    
                    let end = new google.maps.LatLng(rEndSBSL.lat, rEndSBSL.lng);
                    let url = "./assets/icon/markerExit.png";
                    let marker = this.mapService.createRouteMarker(end, url, 48);
                    marker.setMap(this.map);
                    this.markersLevel.push(marker);

                    /* rPaths = this.routingService.createRouteInLevel(rStartSBSL, rEndSBSL, this.routingPolygons, routingPointsSBSL); 
                    this.routingPaths = this.mapService.createRoutePolyline(rPaths);                
                    this.routingPaths.setMap(this.map);

                    let end = new google.maps.LatLng(rEndSBSL.lat, rEndSBSL.lng);
                    this.markerExit1 = this.mapService.createRouteMarker(end, "./assets/icon/markerExit.png", 48);
                    this.markerExit1.setMap(this.map); */

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

                            let rPaths = this.routingService.createRouteInLevel(rStartEBSL, rEndEBSL, this.routingPolygons, routingPointsEBSL);                     
                            let polyline = this.mapService.createRoutePolylineRemain(rPaths);                
                            polyline.setMap(this.map);     
                            this.routingPathsRemain.push(rPaths);   
                            this.routingPolylinesRemain.push(polyline);

                            let start = new google.maps.LatLng(parseFloat(rStartEBSL.lat), parseFloat(rStartEBSL.lng));
                            let urlStart = "./assets/icon/markerExit.png";
                            let markerStart = this.mapService.createRouteMarker(start, urlStart, 48);
                            markerStart.setMap(this.map);                    
                            this.markersRemain.push([markerStart]);                     
                            this.markersPathsRemain.push([{position: start, url: urlStart}]);     
            
                            let end = new google.maps.LatLng(rEndEBSL.lat, rEndEBSL.lng);
                            let urlEnd = "./assets/icon/marker.png";
                            let markerEnd = this.mapService.createRouteMarkerRemain(end, urlEnd, 48);
                            markerEnd.setMap(this.map);                    
                            this.markersRemain.push([markerEnd]);                     
                            this.markersPathsRemain.push([{position: end, url: urlEnd}]);                    
        
                            this.routingLevels.push([endBuilding, endLevel]);
            
                            /* rPaths = this.routingService.createRouteInLevel(rStartEBSL, rEndEBSL, this.routingPolygons, routingPointsEBSL); 
                            this.routingPathsRemain2 = this.mapService.createRoutePolylineRemain(rPaths);                
                            this.routingPathsRemain2.setMap(this.map);

                            let start = new google.maps.LatLng(parseFloat(rStartEBSL.lat), parseFloat(rStartEBSL.lng));
                            this.markerExit2 = this.mapService.createRouteMarker(start, "./assets/icon/markerExit.png", 48);
                            this.markerExit2.setMap(this.map);
            
                            let end = new google.maps.LatLng(rEndEBSL.lat, rEndEBSL.lng);
                            this.markerRemain = this.mapService.createRouteMarkerRemain(end, "./assets/icon/marker.png", 48);
                            this.markerRemain.setMap(this.map); */
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

                            let rPaths = this.routingService.createRouteInLevel(rStartEBSL, rEndEBSL, this.routingPolygons, routingPointsEBSL);                     
                            let polyline = this.mapService.createRoutePolylineRemain(rPaths);                
                            polyline.setMap(this.map);     
                            this.routingPathsRemain.push(rPaths);   
                            this.routingPolylinesRemain.push(polyline);
                            
                            let urlStart = "./assets/icon/markerExit.png";
                            let markerStart = this.mapService.createRouteMarker(start, urlStart, 48);
                            markerStart.setMap(this.map);                    
                            this.markersRemain.push([markerStart]);                     
                            this.markersPathsRemain.push([{position: start, url: urlStart}]);     
            
                            let end = new google.maps.LatLng(rEndEBSL.lat, rEndEBSL.lng);
                            let urlEnd = "./assets/icon/markerChange.png";
                            let markerEnd = this.mapService.createRouteMarkerRemain(end, urlEnd, 48);
                            markerEnd.setMap(this.map);                    
                            this.markersRemain.push([markerEnd]);                     
                            this.markersPathsRemain.push([{position: end, url: urlEnd}]);                    
        
                            this.routingLevels.push([endBuilding, 0]);
            
                            /* rPaths = this.routingService.createRouteInLevel(rStartEBSL, rEndEBSL, this.routingPolygons, routingPointsEBSL); 

                            this.routingPathsRemain2 = this.mapService.createRoutePolylineRemain(rPaths);                
                            this.routingPathsRemain2.setMap(this.map);
                            
                            this.markerExit2 = this.mapService.createRouteMarker(start, "./assets/icon/markerExit.png", 48);
                            this.markerExit2.setMap(this.map);
            
                            let end = new google.maps.LatLng(rEndEBSL.lat, rEndEBSL.lng);
                            this.markerChangeRemain2 = this.mapService.createRouteMarkerRemain(end, "./assets/icon/markerChange.png", 48);
                            this.markerChangeRemain2.setMap(this.map); */

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

                                let rPaths = this.routingService.createRouteInLevel(rStartEBEL, rEndEBEL, this.routingPolygons, routingPointsEBEL);                     
                                let polyline = this.mapService.createRoutePolylineRemain(rPaths);                
                                polyline.setMap(this.map);     
                                this.routingPathsRemain.push(rPaths);   
                                this.routingPolylinesRemain.push(polyline);
                
                                let end = new google.maps.LatLng(rEndEBEL.lat, rEndEBEL.lng);
                                let url = "./assets/icon/marker.png";
                                let marker = this.mapService.createRouteMarkerRemain(end, url, 48);
                                marker.setMap(this.map);                    
                                this.markersRemain.push([marker]);                     
                                this.markersPathsRemain.push([{position: end, url: url}]);                    
            
                                this.routingLevels.push([endBuilding, endLevel]);
            
                                /* rPaths = this.routingService.createRouteInLevel(rStartEBEL, rEndEBEL, this.routingPolygons, routingPointsEBEL); 
                                this.routingPathsRemain3 = this.mapService.createRoutePolylineRemain(rPaths);                
                                this.routingPathsRemain3.setMap(this.map);
            
                                let end = new google.maps.LatLng(rEndEBEL.lat, rEndEBEL.lng);
                                this.markerRemain = this.mapService.createRouteMarkerRemain(end, "./assets/icon/marker.png", 48);
                                this.markerRemain.setMap(this.map); */
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

                    this.routingPathsLevel = this.routingService.createRouteInLevel(rStartSBSL, rEndSBSL, this.routingPolygons, routingPointsSBSL); 
                    this.routingPathsLevel.splice(0, 1); // removes current position for update, temporary
                    let polyline = this.mapService.createRoutePolyline(this.routingPathsLevel);                
                    polyline.setMap(this.map);                
                    this.routingPolylineLevel = polyline;     
    
                    let end = new google.maps.LatLng(rEndSBSL.lat, rEndSBSL.lng);
                    let url = "./assets/icon/markerChange.png";
                    let marker = this.mapService.createRouteMarker(end, url, 48);
                    marker.setMap(this.map);
                    this.markersLevel.push(marker);
    
                    /* rPaths = this.routingService.createRouteInLevel(rStartSBSL, rEndSBSL, this.routingPolygons, routingPointsSBSL); 
                    this.routingPaths = this.mapService.createRoutePolyline(rPaths);                
                    this.routingPaths.setMap(this.map);
    
                    let end = new google.maps.LatLng(rEndSBSL.lat, rEndSBSL.lng);
                    this.markerChange = this.mapService.createRouteMarker(end, "./assets/icon/markerChange.png", 48);
                    this.markerChange.setMap(this.map); */

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

                        let rPaths = this.routingService.createRouteInLevel(rStartSBEL, rEndSBEL, this.routingPolygons, routingPointsSBEL);                     
                        let polyline = this.mapService.createRoutePolylineRemain(rPaths);                
                        polyline.setMap(this.map);     
                        this.routingPathsRemain.push(rPaths);   
                        this.routingPolylinesRemain.push(polyline);
        
                        let end = new google.maps.LatLng(rEndSBEL.lat, rEndSBEL.lng);
                        let url = "./assets/icon/markerExit.png";
                        let marker = this.mapService.createRouteMarkerRemain(end, url, 48);
                        marker.setMap(this.map);                    
                        this.markersRemain.push([marker]);                     
                        this.markersPathsRemain.push([{position: end, url: url}]);                    
    
                        this.routingLevels.push([this.currentBuilding, this.currentLevel]);
                        
                        /* rPaths = this.routingService.createRouteInLevel(rStartSBEL, rEndSBEL, this.routingPolygons, routingPointsSBEL); 
                        this.routingPathsRemain1 = this.mapService.createRoutePolylineRemain(rPaths);                
                        this.routingPathsRemain1.setMap(this.map);
    
                        let end = new google.maps.LatLng(rEndSBEL.lat, rEndSBEL.lng);
                        this.markerExitRemain = this.mapService.createRouteMarkerRemain(end, "./assets/icon/markerExit.png", 48);
                        this.markerExitRemain.setMap(this.map); */

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
                                
                                let start = new google.maps.LatLng(parseFloat(rStartEBSL.lat), parseFloat(rStartEBSL.lng));
                                let urlStart = "./assets/icon/markerExit.png";
                                let markerStart = this.mapService.createRouteMarker(start, urlStart, 48);
                                markerStart.setMap(this.map);                    
                                this.markersRemain.push([markerStart]);                     
                                this.markersPathsRemain.push([{position: start, url: urlStart}]);     
                
                                let end = new google.maps.LatLng(rEndEBSL.lat, rEndEBSL.lng);
                                let urlEnd = "./assets/icon/markerChange.png";
                                let markerEnd = this.mapService.createRouteMarkerRemain(end, urlEnd, 48);
                                markerEnd.setMap(this.map);                    
                                this.markersRemain.push([markerEnd]);                     
                                this.markersPathsRemain.push([{position: end, url: urlEnd}]);                    
            
                                this.routingLevels.push([endBuilding, 0]);
                
                                /* rPaths = this.routingService.createRouteInLevel(rStartEBSL, rEndEBSL, this.routingPolygons, routingPointsEBSL); 
                                this.routingPathsRemain2 = this.mapService.createRoutePolylineRemain(rPaths);                
                                this.routingPathsRemain2.setMap(this.map);

                                let start = new google.maps.LatLng(parseFloat(rStartEBSL.lat), parseFloat(rStartEBSL.lng));
                                this.markerExit2 = this.mapService.createRouteMarker(start, "./assets/icon/markerExit.png", 48);
                                this.markerExit2.setMap(this.map);
                
                                let end = new google.maps.LatLng(rEndEBSL.lat, rEndEBSL.lng);
                                this.markerRemain = this.mapService.createRouteMarkerRemain(end, "./assets/icon/marker.png", 48);
                                this.markerRemain.setMap(this.map); */
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

                                let urlStart = "./assets/icon/markerExit.png";
                                let markerStart = this.mapService.createRouteMarker(start, urlStart, 48);
                                markerStart.setMap(this.map);                    
                                this.markersRemain.push([markerStart]);                     
                                this.markersPathsRemain.push([{position: start, url: urlStart}]);     
                
                                let end = new google.maps.LatLng(rEndEBSL.lat, rEndEBSL.lng);
                                let urlEnd = "./assets/icon/markerChange.png";
                                let markerEnd = this.mapService.createRouteMarkerRemain(end, urlEnd, 48);
                                markerEnd.setMap(this.map);                    
                                this.markersRemain.push([markerEnd]);                     
                                this.markersPathsRemain.push([{position: end, url: urlEnd}]);                    
            
                                this.routingLevels.push([endBuilding, 0]);
                
                                /* rPaths = this.routingService.createRouteInLevel(rStartEBSL, rEndEBSL, this.routingPolygons, routingPointsEBSL); 

                                this.routingPathsRemain2 = this.mapService.createRoutePolylineRemain(rPaths);                
                                this.routingPathsRemain2.setMap(this.map);
                                
                                this.markerExit2 = this.mapService.createRouteMarker(start, "./assets/icon/markerExit.png", 48);
                                this.markerExit2.setMap(this.map);
                
                                let end = new google.maps.LatLng(rEndEBSL.lat, rEndEBSL.lng);
                                this.markerChangeRemain2 = this.mapService.createRouteMarkerRemain(end, "./assets/icon/markerChange.png", 48);
                                this.markerChangeRemain2.setMap(this.map); */

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

                                    let rPaths = this.routingService.createRouteInLevel(rStartEBEL, rEndEBEL, this.routingPolygons, routingPointsEBEL);                     
                                    let polyline = this.mapService.createRoutePolylineRemain(rPaths);                
                                    polyline.setMap(this.map);     
                                    this.routingPathsRemain.push(rPaths);   
                                    this.routingPolylinesRemain.push(polyline);
                    
                                    let end = new google.maps.LatLng(rEndEBEL.lat, rEndEBEL.lng);
                                    let url = "./assets/icon/marker.png";
                                    let marker = this.mapService.createRouteMarkerRemain(end, url, 48);
                                    marker.setMap(this.map);                    
                                    this.markersRemain.push([marker]);                     
                                    this.markersPathsRemain.push([{position: end, url: url}]);                    
                
                                    this.routingLevels.push([endBuilding, endLevel]);
                
                                    /* rPaths = this.routingService.createRouteInLevel(rStartEBEL, rEndEBEL, this.routingPolygons, routingPointsEBEL); 
                                    this.routingPathsRemain3 = this.mapService.createRoutePolylineRemain(rPaths);                
                                    this.routingPathsRemain3.setMap(this.map);
                
                                    let end = new google.maps.LatLng(rEndEBEL.lat, rEndEBEL.lng);
                                    this.markerRemain = this.mapService.createRouteMarkerRemain(end, "./assets/icon/marker.png", 48);
                                    this.markerRemain.setMap(this.map); */
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

    public updateRoute() {
        console.log("Update route.");
        let currentLatLng = new google.maps.LatLng(parseFloat(this.currentPosition.lat), parseFloat(this.currentPosition.lng));
        let firstPathLatLng = new google.maps.LatLng(parseFloat(this.routingPathsLevel[0].lat), parseFloat(this.routingPathsLevel[0].lng));
        if (this.routingService.computeDistance(currentLatLng, firstPathLatLng) < 5) {
            if (this.routingPathsLevel.length < 2) {
                // Level change
                if (this.routingPathsRemain.length > 0) {
                    console.log("rPathsRemain > 0: " + this.routingPathsRemain.length);
                    // Remove old new level paths / polylines and set new ones
                    this.routingPolylineLevel.setMap(null);
                    this.routingPathsLevel = this.routingPathsRemain[0];                    
                    this.routingPathsRemain.splice(0, 1);
                    this.routingPolylinesRemain[0].setMap(null);
                    this.routingPolylinesRemain.splice(0, 1);                      
                    this.routingPolylineLevel = this.mapService.createRoutePolyline(this.routingPathsLevel);  
                    this.routingPolylineLevel.setMap(this.map);

                    // Remove old level markers and set new ones
                    for (let x in this.markersLevel) this.markersLevel[x].setMap(null)    
                    let markersRemain = this.markersRemain[0];
                    for (let x in markersRemain) markersRemain[x].setMap(null);
                    this.markersRemain.splice(0, 1);    
                                 
                    this.markersLevel = [];                    

                    //  Change current level
                    let checkBuilding = this.routingLevels[0][0];
                    if (this.currentBuilding == checkBuilding) this.changeCurrentLevel(this.routingLevels[0][0], this.routingLevels[0][1]);
                    else (this.testState = 'on');
                    let markersPathsRemain = this.markersPathsRemain[0];       
                    for (let x in markersPathsRemain) {
                        let marker = this.mapService.createRouteMarker(markersPathsRemain[x].position, markersPathsRemain[x].url, 48);
                        marker.setMap(this.map);
                        this.markersLevel.push(marker);
                    } 
                    this.routingLevels.splice(0, 1);
                } else {
                    // finish route
                    console.log("rPathsRemain != > 0: " + this.routingPathsRemain.length);
                    console.log("Zielpunkt erreicht.");                
                    this.routeState = 'off';
                    console.log("routeState: " + this.routeState);
                    if (this.infoViewState = 'in') this.toggleInfoView();
                    this.cleanRouteElements();
                    // TODO popup ziel erreicht
                    let alert = this.alertCtrl.create({
                          title: 'Ziel erreicht!',
                          //subTitle: 'Ziel erreicht.',
                          buttons: ['OK']
                        });
                    alert.present();
                }                
            } else {
                console.log("Splice routing path level.");
                this.routingPathsLevel.splice(0, 1);
                this.routingPolylineLevel.setMap(null);
                this.routingPolylineLevel = this.mapService.createRoutePolyline(this.routingPathsLevel);
                this.routingPolylineLevel.setMap(this.map);
            }
        }
        // updates polyline from current position to first path of level route polyline
        if (this.routeState == 'on') {
            if (this.routingPolylineLevelPosition != null) this.routingPolylineLevelPosition.setMap(null);   
            if (this.routingPathsLevelPosition != null) this.routingPathsLevelPosition = [];
            this.routingPathsLevelPosition.push(this.currentPosition);
            this.routingPathsLevelPosition.push(this.routingPathsLevel[0]);
            this.routingPolylineLevelPosition = this.mapService.createRoutePolyline(this.routingPathsLevelPosition);
            this.routingPolylineLevelPosition.setMap(this.map);
        }
    }

    private cleanRouteElements() {
        if (this.routingPolygons != null) this.routingPolygons = this.cleanPolygons(this.routingPolygons);
        if (this.routingPolylineLevel != null) this.routingPolylineLevel.setMap(null);
        if (this.routingPolylineLevelPosition != null) this.routingPolylineLevelPosition.setMap(null);
        if (this.markersLevel != null) for (let x in this.markersLevel) this.markersLevel[x].setMap(null);
        if (this.markersRemain != null) {
            for (let i = 0; i < this.markersRemain.length; i++) {
                for (let j = 0; j < this.markersRemain[i].length; j++) this.markersRemain[i][j].setMap(null);
            }
        }
        this.markersPathsLevel = [];
        this.markersPathsRemain = [];
        this.routingPathsLevel = [];
        this.routingPathsLevelPosition = [];
        this.routingPathsRemain = [];
    }

    public togglePosition() {
        this.positionState = (this.positionState == 'off') ? 'on' : 'off';
    }
}