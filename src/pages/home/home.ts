import { Component, ViewChild, ElementRef } from '@angular/core';
import { AlertController, LoadingController, NavController, Platform } from 'ionic-angular';
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

    // routing elements
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

    // beacon variables
    public beacons: any[] = [];
    public tricons: any[] = [];
    
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

    constructor(public alertCtrl: AlertController,
                public navCtrl: NavController,
                public loadCtrl: LoadingController,
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
            // this.currentPosition = {lng: 13.35536653536712, lat: 52.54527924438224};

            this.beaconService.setupBeacons();
            this.beaconService.startRangingBeacons();

            // Interval positioning from available methods
            setInterval(() => { 
                this.checkLog = "";
                this.checkBeacons();
                this.getCurrentPosition();
                if (this.routeState == 'on') this.updateRoute();
             }, 3000);            
        });
    }

    // UI
    public toggleListView() {
        this.listViewState = (this.listViewState == 'out') ? 'in' : 'out';
    }

    public toggleInfoView() {
        this.infoViewState = (this.infoViewState == 'out') ? 'in' : 'out';
    }

    public toggleMapView() {
        this.mapViewState = (this.mapViewState == 'on') ? 'off' : 'on';
    }

    public initializeRoomListView() {  
        console.log("Initialize ListView.")  
        this.dbService.getRoomsListView().subscribe(data => {
            this.roomsListView = data;
            this.roomsListViewBackup = this.roomsListView;
        });
        
    }

    /**
     * Loads polygon data on google map
     */
    public loadMap() { 
        let loader = this.loadCtrl.create({
            content: "Karte wird geladen...",
        });
        loader.present();

        this.mapViewState = 'off';
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
            // TESTING
            if (this.routeState = 'on') this.currentPosition = {lat: event.latLng.lat(), lng: event.latLng.lng()};
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
                    // TESTING #############################################
                    if (room.type == "floor") {
                        google.maps.event.addListener(polygon, 'click', (event) => {
                            this.positionState = 'off';
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
                    loader.dismiss();
                })
            })              
        }
    }   

    /**
     * Retrieves current position from beacons or gps
     */
    public getCurrentPosition() {        
        this.checkLog += "Position-";
        if (this.positionState == "on") {
            if (this.beacons.length > 2) {
                this.currentPosition = this.getCurrentPositionBeacons(); 
                console.log(this.checkLog);              
            } else {
                this.mapService.getCurrentPositionGPS().subscribe(data => {
                    this.currentPosition = data;
                    this.checkLog += "GPS: " + this.currentPosition.lat + ", " + this.currentPosition.lng;                
                    console.log(this.checkLog);
                });            
            }  
        }
        if (this.currentPosition != null) {
            this.getCurrentBuilding();
            this.displayCurrentPosition();    
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
            // if (this.mapViewState == 'on') this.map.panTo(center); // BUG? Uncaught RangeError: Maximum call stack size exceeded
        }
    }

    /**
     * Checks for the current displayed building by current user position
     */
    public getCurrentBuilding() {
        this.previousBuilding = this.currentBuilding;
        let buildings = this.dbService.getBuildingsCentroids();
        let positionLatLng = new google.maps.LatLng(this.currentPosition.lat, this.currentPosition.lng);
        
        let buildingsSort = this.routingService.sortByDistance(buildings, positionLatLng);
        this.currentBuilding = buildingsSort[0].name;
        this.checkLog += ", Current Building: " + this.currentBuilding;  

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
        for (let i = 0; i < 3; i++) {
            let latLngAlt = this.beacons[i].coordinates.split(", ");                
            this.tricons.push({lat: latLngAlt[0], lng: latLngAlt[1], distance: this.beacons[i].accCK, elevation: latLngAlt[2]});         
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
                                });   
                            });
                        }
                    });
                });
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
                    console.log("Finished navigation.");                
                    this.routeState = 'off';
                    if (this.infoViewState = 'in') this.toggleInfoView();
                    this.cleanRouteElements();
                    // TODO popup ziel erreicht
                    let alert = this.alertCtrl.create({
                          title: 'Ziel erreicht!',
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

    /**
     * Cleans all route markers and polylines from google map
     */
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
    
    // TESTING
    public calcDistance() {
        let dataB = [3.0023675707753243, 2.827496576265333, 1.4474813430164315, 3.832204320950111];
        let resultB = 0;

        for (let x in dataB) resultB += dataB[x];
        resultB = resultB / dataB.length;
        console.log("Average - B: " + resultB);

        let dataG = [19.297666505635657, 9.51743552059129, 17.670235784163573, 9.478214841107738, 4.901063567302042, 7.263688767724918, 3.202087553214465, 11.235535685080439];
        let resultG = 0;

        for (let x in dataG) resultG += dataG[x];
        resultG = resultG / dataG.length;
        console.log("Average - G: " + resultG);
        /* let c1 = {lat: 52.545433, lng: 13.354733};
        let c2 = {lat: 52.545391, lng: 13.354649};

        let b = this.routingService.calcBearing(c1, c2);
        console.log("Bearing: " + b);

        console.log("CalcDistance:");
        let coordinatesB: any[] = [];
        let coordinatesG: any[] = [];
        // let real = new google.maps.LatLng(52.5454047506, 13.3549174452); // KG inside
        // let real = new google.maps.LatLng(52.5455275954, 13.3551527145); // KG outisde  
        // let real = new google.maps.LatLng(52.5454199756, 13.3548792411); // EG inside 
        // let real = new google.maps.LatLng(52.5453287944, 13.3547302387); // EG outside
        let real = new google.maps.LatLng(52.5452724743, 13.3553667454); // 1OG inside
        // let real = new google.maps.LatLng(52.5451734094, 13.3553354693); // 1OG outside
        // let real = new google.maps.LatLng(52.5453648944, 13.355074003); // 4OG inside
        // let real = new google.maps.LatLng(52.5454257918, 13.3548524763); // 4OG outside

        let dataB = [52.54527590248881, 13.3553596625353, 52.545279527623725, 13.355350652458145, 52.54524062201692, 13.355354390616687, 52.54526467782957, 13.355368769778254, 52.545270637978554, 13.355356458229224, 52.54527770946074, 13.355363248132347, 52.54528912143194, 13.35535159538737, 52.545279950190294, 13.355355706556745, 52.54528555367941, 13.355359230535718, 52.545286001275925, 13.355382966361608];
        let dataG = [52.5453343, 13.354591, 52.545311, 13.3546098, 52.5452726, 13.3546665, 52.5453026, 13.3545905, 52.5453026, 13.3545905, 52.5452726, 13.3546665, 52.5452642, 13.3546473, 52.5452642, 13.3546473, 52.5453343, 13.354591, 52.5452726, 13.354541];
        for (let i = 0; i < dataB.length; i += 2) coordinatesB.push(new google.maps.LatLng(dataB[i], dataB[i + 1]));
        for (let i = 0; i < dataG.length; i += 2) coordinatesG.push(new google.maps.LatLng(dataG[i], dataG[i + 1]));

        let distancesBStr = "[";
        for (let x in coordinatesB) {
            //let distance = this.routingService.computeDistance(real, coordinates[x]);
            let distance = google.maps.geometry.spherical.computeDistanceBetween(real, coordinatesB[x]);
            console.log(x + " - Distance: " + distance);
            distancesBStr += distance + ", ";
        }
        console.log(distancesBStr);
        console.log("###############################################");

        let distancesGStr = "[";
        for (let x in coordinatesG) {
            //let distance = this.routingService.computeDistance(real, coordinates[x]);
            let distance = google.maps.geometry.spherical.computeDistanceBetween(real, coordinatesG[x]);
            console.log(x + " - Distance: " + distance);
            distancesGStr += distance + ", ";
        }
        console.log(distancesGStr);
        console.log("###############################################"); */
    }
}