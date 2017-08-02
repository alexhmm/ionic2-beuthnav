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
    public triangles: any[] = [];
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

    // testing
    public headingPoints: any[] = [];   
    public circleTest; 
    public iCounter = 0;

    // routing variables
    public controlPolygon;
    public routingPolygon;
    public pHeadings: any[] = [];
    public pPaths: any[] = [];

    // routing paths (Polyline)
    public rPathsC: any[] = [];
    public rPathsCC: any[] = [];
    public rPathsCCN: any[] = [];

    // intersect vertices
    public iPathsC: any[] = [];
    public iPathsCC: any[] = [];

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

        this.dbService.getRoutePointByName("d00Points", "E31").subscribe(data => {
            let rStart = {lat: 52.54568, lng: 13.35582};
            let rEnd = {lat: data.lat, lng: data.lng};            
            this.startRouting(rStart, rEnd);
        });

        // let rEnd = new google.maps.LatLng(52.54557, 13.35569);
        // let rEnd = new google.maps.LatLng(52.54566, 13.35552);

        // start 13.35582,52.54567
        // end1 52.54548, 13.35553
        // end3 52.54557, 13.35569
    }    

    // ############### //
    // ### ROUTING ### //
    // ############### //
    public startRouting(startPosition, endPosition) {
        // Reset routing and intersect paths, clock and counter-clock
        this.rPathsC = [];
        this.rPathsCC = [];
        this.iPathsC = [];
        this.iPathsCC = [];
        // testing
        this.iCounter = 0;

        // ### TODO clean routing polyline from map
        if (this.triangles != null) {
            for (let x in this.triangles) {
                 this.triangles[x].setMap(null);            
            }
            this.triangles = [];
        }        
        // ### TODO: determine routing polygon (index)
        let routingPolygonIndex = 84;

        // ### TODO: check if start and end position is in same house and tier

        // Set start and end position for this loop
        let rStart = new google.maps.LatLng(parseFloat(startPosition.lat), parseFloat(startPosition.lng));
        let rEnd = new google.maps.LatLng(parseFloat(endPosition.lat), parseFloat(endPosition.lng));

        // Add all polygon points to array
        let pPathsRaw: any[] = [];
        let currentPolygonLength = this.polygons[routingPolygonIndex].getPath().getLength();
        for (let i = 0; i < currentPolygonLength; i++) {
            let pLatLng = this.polygons[routingPolygonIndex].getPath().getAt(i).toUrlValue(7).split(",");
            pPathsRaw.push({lat: pLatLng[0], lng: pLatLng[1]});
        }             
        console.log("Raw polygon paths length: " + pPathsRaw.length);

        // Determine headings for all raw paths
        this.pHeadings = [];
        for (let i = 0; i < pPathsRaw.length; i++) {
            if (i == pPathsRaw.length - 1) {
                this.pHeadings.push(this.mapService.calcBearing(pPathsRaw[i], pPathsRaw[0]));
            } else {
                this.pHeadings.push(this.mapService.calcBearing(pPathsRaw[i], pPathsRaw[i + 1]));
            }
        }

        // for (let x in this.pHeadings) console.log(this.pHeadings[x]);
        // Exclude läuferpunkte from raw paths where
        // ### TODO: replace elevation with calculation or average by building
        this.pPaths = [];
        for (let i = 0; i < this.pHeadings.length; i++) {
            if (i == 0) {
                let diff = this.pHeadings[i] - this.pHeadings[this.pHeadings.length - 1];
                if (this.mapService.checkBearingDifference(diff)) {
                    this.pPaths.push({lat: pPathsRaw[i].lat, lng: pPathsRaw[i].lng, elevation: "38"});
                    /* let str = "" + (this.pPaths.length - 1);
                    this.addMarker(this.pPaths[this.pPaths.length - 1], str); */
                }
            } else {
                let diff = this.pHeadings[i] - this.pHeadings[i - 1];
                if (this.mapService.checkBearingDifference(diff)) {
                    this.pPaths.push({lat: pPathsRaw[i].lat, lng: pPathsRaw[i].lng, elevation: "38"});  
                    /* let str = "" + (this.pPaths.length - 1);
                    this.addMarker(this.pPaths[this.pPaths.length - 1], str); */
                }
            }
        }  

        let pPaths: any[] = [];
        for (let x in this.pPaths) pPaths.push(new google.maps.LatLng(parseFloat(this.pPaths[x].lat), parseFloat(this.pPaths[x].lng)));

        // Create invisible background true polygon for intersection check
        console.log("True polygon paths length: " + this.pPaths.length);
        this.routingPolygon = new google.maps.Polygon();
        this.routingPolygon.setOptions(this.mapService.createPolygonBuildingOptions(pPaths));  
        
        // Create triangle points
        let ePoints: any[] = [];
        let tPointsECEF: any[] = [];
        for (let x in this.pPaths) {
            let ePoint = this.mapService.LLAtoECEF(this.pPaths[x].lat, this.pPaths[x].lng, this.pPaths[x].elevation);
            ePoints.push(ePoint);
            tPointsECEF.push(ePoint[0]);
            tPointsECEF.push(ePoint[1]);
            //console.log(ePoint);
        }

        // Get indices for earcut triangulation
        let indices = this.mapService.testEarcut(tPointsECEF);
        
        let tPoints: any[] = [];

        // Create triangle points array through indices iteration
        for (let x in indices) {
            // push indices? x
            tPoints.push(this.mapService.ECEFtoLLA(ePoints[indices[x]][0], ePoints[indices[x]][1], ePoints[indices[x]][2]));
            //console.log(tPointsLLA[x]);
        }

        // Iterate through all triangle points and create triangle polygons
        for (let i = 0; i < tPoints.length; i += 3) {
            let trianglePathsLLA: any[] = [];
            trianglePathsLLA.push(tPoints[i]);
            trianglePathsLLA.push(tPoints[i + 1]);
            trianglePathsLLA.push(tPoints[i + 2]);
            let triangle = new google.maps.Polygon();
            triangle.setOptions(this.mapService.createTriangleOptions(trianglePathsLLA));
            triangle.setMap(this.map);
            this.triangles.push(triangle);
        }

        console.log("Triangles length: " + this.triangles.length);  

        let rStartIndex, tStartPP, // tStartIndex,
        rEndIndex, tEndPP, tEndIndex,
        rIndex, tIndex;

        // Determine startPointTriangle and endPointTriangle for startPosition and endPosition
        // ### TODO: change startIndex and endIndex to near neighbor?
        for (let x in this.triangles) {
            if (google.maps.geometry.poly.containsLocation(rStart, this.triangles[x]) == true) {
                console.log("TriangleStart: " + x);
                tIndex = x;
                let tLatLng = this.triangles[x].getPath().getAt(0).toUrlValue(7).split(",");
                tStartPP = {lat: parseFloat(tLatLng[0]), lng: parseFloat(tLatLng[1])};
                console.log(tStartPP);
                for (let y in this.pPaths) {
                    let vertex = {lat: this.pPaths[y].lat, lng: this.pPaths[y].lng};
                    //console.log(cleanPoint);
                    if (vertex.lat == tStartPP.lat && vertex.lng == tStartPP.lng) {
                        console.log("IndexStart: " + y);
                        rStartIndex = y;
                        rIndex = y;
                        /* let str = "" + y;
                        this.addMarker(this.pPaths[y], y); */
                        break;
                    }
                }
            }

            if (google.maps.geometry.poly.containsLocation(rEnd, this.triangles[x]) == true) {
                console.log("TriangleEnd: " + x);
                tEndIndex = x;
                let tLatLng = this.triangles[x].getPath().getAt(0).toUrlValue(7).split(",");
                tEndPP = {lat: parseFloat(tLatLng[0]), lng: parseFloat(tLatLng[1])};
                
                //console.log("End Location: " + tEndPP.lat + ", " + tEndPP.lng);
                
                for (let y in this.pPaths) {
                    let vertex = {lat: parseFloat(this.pPaths[y].lat), lng: parseFloat(this.pPaths[y].lng)};
                    //console.log(cleanPoint);
                    if (vertex.lat === tEndPP.lat && vertex.lng === tEndPP.lng) {
                        console.log("IndexEnd: " + y);
                        rEndIndex = +y;
                        /* let str = "" + y;
                        this.addMarker(this.pPaths[y], y); */
                        break;
                    }
                }

                /* let tLatLng1 = this.triangles[x].getPath().getAt(1).toUrlValue(7).split(",");
                let tEndPP1 = {lat: parseFloat(tLatLng1[0]), lng: parseFloat(tLatLng1[1])};

                for (let x in this.pPaths) {
                    let vertex = {lat: this.pPaths[x].lat, lng: this.pPaths[x].lng};
                    //console.log(cleanPoint);
                    if (vertex.lat == tEndPP1.lat && vertex.lng == tEndPP1.lng)
                        console.log("Index 1: " + x);
                }

                let tLatLng2 = this.triangles[x].getPath().getAt(2).toUrlValue(7).split(",");
                let tEndPP2 = {lat: parseFloat(tLatLng1[0]), lng: parseFloat(tLatLng1[1])};

                for (let x in this.pPaths) {
                    let vertex = {lat: this.pPaths[x].lat, lng: this.pPaths[x].lng};
                    //console.log(cleanPoint);
                    if (vertex.lat == tEndPP2.lat && vertex.lng == tEndPP2.lng)
                        console.log("Index 2: " + x);
                } */
            }
        }

        // Iterate through all points in routing polygon FUNNEL ALGORITHM
        let pLength = this.pPaths.length;

        // Push starting location to routingPath and intersectPath arrays
        this.rPathsC.push({lat: rStart.lat(), lng: rStart.lng()});
        this.rPathsCC.push({lat: rStart.lat(), lng: rStart.lng()});
        this.iPathsC.push({lat: rStart.lat(), lng: rStart.lng()});
        this.iPathsCC.push({lat: rStart.lat(), lng: rStart.lng()});        

        // Set startIndex for both directions
        let indexC = rStartIndex;
        let indexCC = rStartIndex;

        // Push first triangle point into iPaths
        /* this.iPathsC.push({lat: parseFloat(this.pPaths[indexC].lat), lng: parseFloat(this.pPaths[indexC].lng)});
        this.iPathsCC.push({lat: parseFloat(this.pPaths[indexCC].lat), lng: parseFloat(this.pPaths[indexCC].lng)}); */

        console.log("#######################################");
        // Iterate through all routingPolygon vertices
        for (let i = 1; i < pLength; i++) {   
            //debugger;
            let rLengthC = this.rPathsC.length;
            let rLengthCC = this.rPathsCC.length;    

            // console.log("RoutingPaths Clock: " + rLengthC);
            //for (let i = 0; i < rLengthC; i++) console.log("rC - " + i + ": " + this.rPathsC[i].lat + ", " + this.rPathsC[i].lng);      
            // console.log("RoutingPaths CounterClock: " + rLengthCC);
            //for (let i = 0; i < rLengthCC; i++) console.log("rCC - " + i + ": " + this.rPathsCC[i]);

            // prev Vertex
            let pIndexCC = indexCC + 1;
            if (pIndexCC > pLength - 1) pIndexCC = 0; 
            let prevVertex = {lat: parseFloat(this.pPaths[pIndexCC].lat), lng: parseFloat(this.pPaths[pIndexCC].lng)};

            // current Vertex
            let currVertex = {lat: parseFloat(this.pPaths[indexCC].lat), lng: parseFloat(this.pPaths[indexCC].lng)};
            
            // Increase and decrease indices to go through routingPolygon vertices in both directions
            indexC++;
            indexCC--;   

            // If out of bound: reset index
            if (indexC === pLength - 1) indexC = 0;
            if (indexCC === -1) indexCC = pLength - 1; 

            // Splice prevVertex out of intersectPaths for next intersection check
            if (this.iPathsC.length > 1) this.iPathsC.splice(1, 1);
            if (this.iPathsCC.length > 1) this.iPathsCC.splice(1, 1);
            
            // Push nextVertex to intersect vertices array
            this.iPathsC.push({lat: parseFloat(this.pPaths[indexC].lat), lng: parseFloat(this.pPaths[indexC].lng)});
            this.iPathsCC.push({lat: parseFloat(this.pPaths[indexCC].lat), lng: parseFloat(this.pPaths[indexCC].lng)});

            // Intersect Paths length
            let iLengthC = this.iPathsC.length;
            let iLengthCC = this.iPathsCC.length;
            
            // Finish routing algorithm if current routingPolygonPath reached endTriangle
            let pEndC = new google.maps.LatLng(parseFloat(this.iPathsC[this.iPathsC.length - 1].lat), parseFloat(this.iPathsC[this.iPathsC.length - 1].lng));
            let pEndCC = new google.maps.LatLng(parseFloat(this.iPathsCC[this.iPathsCC.length - 1].lat), parseFloat(this.iPathsCC[this.iPathsCC.length - 1].lng));
            
             /* if (google.maps.geometry.poly.containsLocation(pEndC, this.triangles[tEndIndex])) {
                console.log("Finish Clock: " + google.maps.geometry.poly.containsLocation(pEndC, this.triangles[tEndIndex]) + ", " + tEndIndex);
                this.rPathsC.push({lat: rEnd.lat(), lng: rEnd.lng()});
                let polyline = this.mapService.createPolyline(this.rPathsC);     
                polyline.setMap(this.map);
                break;
            }  */
            if (google.maps.geometry.poly.containsLocation(pEndCC, this.triangles[tEndIndex])) {
                console.log("Finish CClock: " + google.maps.geometry.poly.containsLocation(pEndCC, this.triangles[tEndIndex]) + ", " + tEndIndex);

                let continueVertex = null;
                // 1st check
                let next1 = {lat: parseFloat(this.pPaths[indexCC].lat), lng: parseFloat(this.pPaths[indexCC].lng)};
                let intersectCC1 = this.getNextRoutingPathN(this.iPathsCC, prevVertex, currVertex, next1, continueVertex);
                if (intersectCC1 != null) {
                    console.log("Intersection at IndexCC: " + indexCC);
                    this.rPathsCC.push(intersectCC1);
                }       

                // 2nd check
                let fPrev = currVertex;
                let fCurr = {lat: parseFloat(this.pPaths[indexCC].lat), lng: parseFloat(this.pPaths[indexCC].lng)};
                // ##########
                let nIndexCC = indexCC - 1;
                if (nIndexCC === -1) nIndexCC = pLength - 1; 
                let fNext = {lat: parseFloat(this.pPaths[nIndexCC].lat), lng: parseFloat(this.pPaths[nIndexCC].lng)};
                
                // ##########
                this.iPathsCC = [];
                this.iPathsCC.push({lat: parseFloat(this.rPathsCC[this.rPathsCC.length - 1].lat), lng: parseFloat(this.rPathsCC[this.rPathsCC.length - 1].lng)});
                this.iPathsCC.push({lat: rEnd.lat(), lng: rEnd.lng()});
                let intersectCC2 = this.getNextRoutingPathN(this.iPathsCC, fPrev, fCurr, fNext, continueVertex);
                if (intersectCC2 != null) {
                    console.log("Intersection at IndexCC: " + indexCC);
                    this.rPathsCC.push(intersectCC2);
                }                
                this.rPathsCC.push({lat: rEnd.lat(), lng: rEnd.lng()});
                for (let x in this.rPathsCC) console.log(this.rPathsCC[x]);
                
                /* let lengthBefore = this.rPathsCC.length;
                let lengthAfter = 0;          
                if (this.rPathsCC.length > 2) {                    
                    while (lengthAfter != lengthBefore) {
                        lengthBefore = this.rPathsCC.length;
                        let tPathsCC: any[] = [];
                        tPathsCC.push(this.rPathsCC[0]); // add start to temporary
                        console.log("Entering while.");
                        for (let i = 0; i < this.rPathsCC.length - 2; i++) {
                            let indices: any[] = [];
                            let iRPaths: any[] = [];
                            iRPaths.push(this.rPathsCC[i]);
                            iRPaths.push(this.rPathsCC[i + 1]);
                            iRPaths.push(this.rPathsCC[i + 2]);
                            let intersect = this.getNextRoutingPathN(iRPaths);
                            if (intersect != null) {
                                // intersect finish
                                tPathsCC.push(this.rPathsCC[i + 1]);
                            }                            
                        }  
                        tPathsCC.push(this.rPathsCC[lengthBefore - 1]);
                        lengthAfter = tPathsCC.length;
                        this.rPathsCC = tPathsCC;
                    }           
                } */
                let polyline = this.mapService.createPolyline(this.rPathsCC);                
                polyline.setMap(this.map);
                break;
            }

            // Start intersection check for both directions
            if (this.iPathsC.length > 1) {
                //console.log("iPathsC.length: " + this.iPathsC.length);
                //for (let i = 0; i < this.iPathsC.length; i++) console.log("iC - " + i + ": " + this.iPathsC[i].lat + ", " + this.iPathsC[i].lng);
                /* let intersectC = this.getNextRoutingPathN(this.iPathsC);
                if (intersectC != null) {
                    this.rPathsC.push(intersectC[0]);
                    this.iPathsC = [];
                    this.iPathsC.push(intersectC[1]);
                    this.iPathsC.push(intersectC[2]);
                } */
                /* let intersectC = this.getNextRoutingPath(this.iPathsC, indexC);
                if (intersectC != null) {
                    console.log("Intersect C != null.");
                    this.rPathsC.push(intersectC[0]);
                    this.iPathsC = [];
                    this.iPathsC.push(intersectC[1]);
                    this.iPathsC.push(intersectC[2]);
                }          */       
            } 
            if (this.iPathsCC.length > 1) {
                //console.log("iPathsCC.length: " + this.iPathsCC.length);
                // ##########
                let cIndexCC = indexCC - 1;
                if (cIndexCC === -1) cIndexCC = pLength - 1; 
                let continueVertex = {lat: parseFloat(this.pPaths[cIndexCC].lat), lng: parseFloat(this.pPaths[cIndexCC].lng)};
                // ##########

                let intersectCC = this.getNextRoutingPathN(this.iPathsCC, prevVertex, currVertex, this.iPathsCC[1], continueVertex);
                if (intersectCC != null) {
                    console.log("Intersection at IndexCC: " + indexCC);
                    this.rPathsCC.push(intersectCC);
                    this.iPathsCC = [];
                    this.iPathsCC.push(intersectCC);
                    //this.iPathsC.push(intersectCC[1]);
                    //this.iPathsCC.push(intersectCC);                    
                    //for (let x in this.rPathsCC) console.log(this.rPathsCC[x]);
                }  
                /* let intersectCC = this.getNextRoutingPath(this.iPathsCC, indexCC);
                // for (let i = 0; i < this.iPathsCC.length; i++) console.log("iCC - " + i + ": " + this.iPathsCC[i]);
                if (intersectCC != null) {
                    console.log("Intersect CC != null.");
                    this.rPathsCC.push(intersectCC[0]);
                    this.iPathsCC = [];
                    this.iPathsCC.push(intersectCC[1]);
                    this.iPathsCC.push(intersectCC[2]);
                } */
            } 
        }
    }   

    public getNextRoutingPathN(iPaths: any, prevVertex: any, currVertex: any, nextVertex: any, continueVertex: any) {  
        let length = iPaths.length;         
        
        // intersect check: new potential route path, iPaths length always = 3 / 2
        let i1 = {lat: parseFloat(iPaths[0].lat), lng: parseFloat(iPaths[0].lng)};
        //let i2 = {lat: parseFloat(iPaths[2].lat), lng: parseFloat(iPaths[2].lng)};        
        let i2 = {lat: parseFloat(iPaths[1].lat), lng: parseFloat(iPaths[1].lng)};     

        for (let i = 0; i < this.pPaths.length - 1; i++) {    
            // intersect check: all edges of pPaths
            let p1 = {lat: parseFloat(this.pPaths[i].lat), lng: parseFloat(this.pPaths[i].lng)};
            let p2 = {lat: parseFloat(this.pPaths[i + 1].lat), lng: parseFloat(this.pPaths[i + 1].lng)};

            if (this.mapService.getLineIntersection(p1.lat, p1.lng, p2.lat, p2.lng, i1.lat, i1.lng, i2.lat, i2.lng)) {
                //console.log("Intersection at pPath: " + i + ", p2: " + p2.lat + ", " + p2.lng);
                
                // debugging
                /* let center = new google.maps.LatLng(iPaths[1].lat, iPaths[1].lng);
                this.map.panTo(center);            
                let sect1: any[] = [];
                sect1.push(p1);
                sect1.push(p2);
                let sectLine1 = this.mapService.createPolylineDebug(sect1, '#00FF00');     
                sectLine1.setMap(this.map);
                let sect2: any[] = [];
                sect2.push(i1);
                sect2.push(i2);
                let sectLine2 = this.mapService.createPolylineDebug(sect2, '#FF0000');   
                let zeroVertex = {lat: parseFloat(iPaths[0].lat), lng: parseFloat(iPaths[0].lng)};                  
                sectLine2.setMap(this.map); */
                /* let strZero = "ZeroVertex: " + this.iCounter;
                this.addMarker(zeroVertex, strZero);
                let strNew = "NextVertex: " + this.iCounter;
                this.addMarker(nextVertex, strNew);
                this.iCounter++; */
                //
                //debugger;       

                let direction1;
                let direction2;
                // iPaths length always is 3 (2)
                let heading1 = this.mapService.calcBearing(currVertex, prevVertex);
                let heading2 = this.mapService.calcBearing(currVertex, nextVertex);

                direction1 = Math.abs((heading1 + heading2) / 2);
                if (direction1 > 180) {
                    direction2 = Math.abs(direction1 - 180);
                } else {
                    direction2 = direction1 + 180;
                }
                /* console.log(this.iCounter + " - direction1: " + direction1);
                console.log(this.iCounter + " - direction2: " + direction2); */
        
                let nP1 = this.mapService.getLatLngByAzimuthDistance(currVertex, 1, Math.abs(direction1));
                let nP2 = this.mapService.getLatLngByAzimuthDistance(currVertex, 1, Math.abs(direction2));
                let nP1LLA = new google.maps.LatLng(parseFloat(nP1.lat), parseFloat(nP1.lng));
                let nP2LLA = new google.maps.LatLng(parseFloat(nP2.lat), parseFloat(nP2.lng));

                /* let str1 = this.iCounter + " d1";
                let str2 = this.iCounter + " d2";
                this.addMarker(nP1, str1);
                this.addMarker(nP2, str2);
                this.iCounter++; */

                if (google.maps.geometry.poly.containsLocation(nP1LLA, this.routingPolygon)) {
                    //console.log("Containslocation 1: " + direction1);
                    let newVertex = nP1; 

                    let testPath: any[] = [];
                    testPath.push(currVertex);
                    testPath.push(nP1);

                    let polyline = this.mapService.createPolylineRoute(testPath);
                    polyline.setMap(this.map);
                    
                    return newVertex;
                    //return [newVertex, oldVertex, nextVertex];             
                }

                if (google.maps.geometry.poly.containsLocation(nP2LLA, this.routingPolygon)) {
                    //console.log("Containslocation 2: " + direction2);
                    let newVertex = nP2; 
                    let testPath: any[] = [];
                    testPath.push(currVertex);
                    testPath.push(nP2);

                    let polyline = this.mapService.createPolylineRoute(testPath);
                    polyline.setMap(this.map);
                    
                    return newVertex;
                    //return [newVertex, oldVertex, nextVertex];    
                } else {
                    return currVertex;
                }
            }            
        }     
        return null;   
    }

    public testGS() {
        // same endings = false
        let a1 = {lat: 52.501670, lng: 13.536665}; 
        let a2 = {lat: 52.498431, lng: 13.536836}; 
        let b1 = {lat: 52.498431, lng: 13.536836}; 
        let b2 = {lat: 52.501043, lng: 13.531601};
        let aBlla = this.mapService.getLineIntersection(a1.lat, a1.lng, a2.lat, a2.lng, b1.lat, b1.lng, b2.lat, b2.lng);
        console.log("False Same LLA: " + aBlla);
        let a1ecef = this.mapService.LLAtoECEF(a1.lat, a1.lng, 38);
        let a2ecef = this.mapService.LLAtoECEF(a2.lat, a2.lng, 38);
        let b1ecef = this.mapService.LLAtoECEF(b1.lat, b1.lng, 38);
        let b2ecef = this.mapService.LLAtoECEF(b2.lat, b2.lng, 38);
        let aBecef = this.mapService.getLineIntersection(a1ecef[0], a1ecef[1], a2ecef[0], a2ecef[1], b1ecef[0], b1ecef[1], b2ecef[0], b2ecef[1]);
        console.log("False Same ECEF: " + aBecef);

        let c1 = {lat: 52.501670, lng: 13.536665}; 
        let c2 = {lat: 52.498431, lng: 13.536836}; 
        let d1 = {lat: 52.501409, lng: 13.538639}; 
        let d2 = {lat: 52.501043, lng: 13.531601};
        let cDlla = this.mapService.getLineIntersection(c1.lat, c1.lng, c2.lat, c2.lng, d1.lat, d1.lng, d2.lat, d2.lng);
        console.log("True LLA: " + cDlla);
        let c1ecef = this.mapService.LLAtoECEF(a1.lat, a1.lng, 38);
        let c2ecef = this.mapService.LLAtoECEF(a2.lat, a2.lng, 38);
        let d1ecef = this.mapService.LLAtoECEF(b1.lat, b1.lng, 38);
        let d2ecef = this.mapService.LLAtoECEF(b2.lat, b2.lng, 38);
        let cDecef = this.mapService.getLineIntersection(c1ecef[0], c1ecef[1], c2ecef[0], c2ecef[1], d1ecef[0], d1ecef[1], d2ecef[0], d2ecef[1]);
        console.log("True ECEF: " + cDecef);

        let e1 = {lat: 52.501670, lng: 13.536665}; 
        let e2 = {lat: 52.498431, lng: 13.536836}; 
        let f1 = {lat: 52.503865, lng: 13.545419}; 
        let f2 = {lat: 52.500991, lng: 13.546364};
        let eFlla = this.mapService.getLineIntersection(e1.lat, e1.lng, e2.lat, e2.lng, f1.lat, f1.lng, f2.lat, f2.lng);
        console.log("False LLA: " + eFlla);
        let e1ecef = this.mapService.LLAtoECEF(a1.lat, a1.lng, 38);
        let e2ecef = this.mapService.LLAtoECEF(a2.lat, a2.lng, 38);
        let f1ecef = this.mapService.LLAtoECEF(b1.lat, b1.lng, 38);
        let f2ecef = this.mapService.LLAtoECEF(b2.lat, b2.lng, 38);
        let eFecef = this.mapService.getLineIntersection(e1ecef[0], e1ecef[1], e2ecef[0], e2ecef[1], f1ecef[0], f1ecef[1], f2ecef[0], f2ecef[1]);
        console.log("False ECEF: " + eFecef);        
    }
}