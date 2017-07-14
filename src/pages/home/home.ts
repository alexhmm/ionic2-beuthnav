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
    public cleanPoints: any[] = [];

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
        }    */ 

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
            console.log("MARKER: " + content);
        });

        this.addInfoWindow(this.marker, content);
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

    

    // ############### //
    // ### ROUTING ### //
    // ############### //
    public testRouting() {
        if (this.triangles != null) {
            for (let x in this.triangles) {
                 this.triangles[x].setMap(null);            
            }
            this.triangles = [];
        }

        // testing
        //let randomIndex = Math.floor(Math.random() * this.polygons.length);
        //console.log("random index: " + randomIndex + ", length: " + this.polygons[randomIndex].getPath().getLength());
        let randomIndex = 46;
        // ####

        // add all polygon points to array
        let llaPointsRaw: any[] = [];
        console.log("Raw LLA Points");

        let currentPolygonLength = this.polygons[randomIndex].getPath().getLength();

        for (let i = 0; i < currentPolygonLength; i++) {
            let xy = this.polygons[randomIndex].getPath().getAt(i).toUrlValue(7).split(",");
            llaPointsRaw.push({lat: xy[0], lng: xy[1]});
            //llaPointsRaw.push(new google.maps.LatLng(parseFloat(xy[0]), parseFloat(xy[1])));
            //llaPointsRaw.push(this.getLatLngFromString(this.polygons[randomIndex].getPath().getAt(i).toUrlValue(7)));
            //console.log("xy: " + parseFloat(xy[0]) + ", " + parseFloat(xy[1]));
            //llaPointsRaw.push(new google.maps.LatLng(parseFloat(xy[0]), parseFloat(xy[1])));
            //console.log(llaPointsRaw[i]);
        }     
        
        console.log("Raw length: " + llaPointsRaw.length);
        //for (let x in llaPointsRaw) console.log(llaPointsRaw[x]);        

        let headings: any[] = [];

        for (let i = 0; i < llaPointsRaw.length; i++) {
            if (i == llaPointsRaw.length - 1) {
                //headings.push(google.maps.geometry.spherical.computeHeading(llaPointsRaw[i], llaPointsRaw[0]));
                headings.push(this.mapService.calcBearing(llaPointsRaw[i], llaPointsRaw[0]));
            } else {
                //headings.push(google.maps.geometry.spherical.computeHeading(llaPointsRaw[i], llaPointsRaw[i + 1]));
                headings.push(this.mapService.calcBearing(llaPointsRaw[i], llaPointsRaw[i + 1]));
            }
        }

        for (let x in headings) console.log(headings[x]);

        this.cleanPoints = [];
        for (let i = 0; i < headings.length; i++) {
            if (i == 0) {
                let diff = headings[i] - headings[headings.length - 1];
                if (this.mapService.checkBearingDifference(diff)) this.cleanPoints.push({lat: llaPointsRaw[i].lat, lng: llaPointsRaw[i].lng, elevation: "38"});  
            } else {
                let diff = headings[i] - headings[i - 1];
                if (this.mapService.checkBearingDifference(diff)) this.cleanPoints.push({lat: llaPointsRaw[i].lat, lng: llaPointsRaw[i].lng, elevation: "38"});  
            }
        }  

        console.log("Clean length: " + this.cleanPoints.length);
        let cleanPolygonPaths: any[] = [];;
        for (let x in this.cleanPoints) {
            console.log(this.cleanPoints[x]);        
            cleanPolygonPaths.push({lat: parseFloat(this.cleanPoints[x].lat), lng: parseFloat(this.cleanPoints[x].lng)});
        }
        let cleanPolygon = new google.maps.Polygon();
        cleanPolygon.setOptions(this.mapService.createPolygonBuildingOptions(cleanPolygonPaths));        

        let llaPoints = this.cleanPoints;
        
        // create triangle points
        let ePoints: any[] = [];
        let tPoints: any[] = [];
        for (let x in llaPoints) {
            let ePoint = this.mapService.LLAtoECEF(llaPoints[x].lat, llaPoints[x].lng, llaPoints[x].elevation);
            ePoints.push(ePoint);
            tPoints.push(ePoint[0]);
            tPoints.push(ePoint[1]);
            //console.log(ePoint);
        }

        // get indices for earcut triangulation
        let indices = this.mapService.testEarcut(tPoints);
        //console.log(indices);
        
        let tPointsLLA: any[] = [];

        // create triangle points array through indices iteration
        for (let x in indices) {
            // push indices? x
            tPointsLLA.push(this.mapService.ECEFtoLLA(ePoints[indices[x]][0], ePoints[indices[x]][1], ePoints[indices[x]][2]));
            //console.log(tPointsLLA[x]);
        }

        // iterate through all triangle points and create triangle polygons
        for (let i = 0; i < tPointsLLA.length; i += 3) {
            let trianglePathsLLA: any[] = [];
            trianglePathsLLA.push(tPointsLLA[i]);
            trianglePathsLLA.push(tPointsLLA[i + 1]);
            trianglePathsLLA.push(tPointsLLA[i + 2]);
            /* console.log(trianglePathsLLA[0]);
            console.log(trianglePathsLLA[1]);
            console.log(trianglePathsLLA[2]); */
            let triangle = new google.maps.Polygon();
            triangle.setOptions(this.mapService.createTriangleOptions(trianglePathsLLA));
            triangle.setMap(this.map);
            this.triangles.push(triangle);
        }

         console.log("Triangles length: " + this.triangles.length);
       
        // set start and endpoint
        let routeStartPoint = new google.maps.LatLng(52.54567, 13.35582);
        let routeEndPoint = new google.maps.LatLng(52.54548, 13.35553);

        // start 13.35582,52.54567
        // end1 52.54548, 13.35553
        // end3 52.54557, 13.35569

        let routeStartPolygonPoint, routeStartIndex, triangleStartPolygonPoint, triangleStartIndex,
        routeEndPolygonPoint, routeEndIndex, triangleEndPolygonPoint, triangleEndIndex,
        routeCurrentIndex, triangleCurrentIndex;

        let trianglesUsed: any[] = [];

        // determine startPointPolygon endPointPolygon containsLocation in triangle
        for (let x in this.triangles) {

            // ######## marker test
            let latLngT = this.triangles[x].getPath().getAt(0).toUrlValue(7).split(",");
            let latLng = latLngT[0] + ", " + latLngT[1];
            //this.addMarker(latLng, "Index: " + x);
            // ####################

            // set Start position
            if (google.maps.geometry.poly.containsLocation(routeStartPoint, this.triangles[x]) == true) {
                console.log("CONTAINSLOCATION START");
                triangleCurrentIndex = x;
                trianglesUsed.push(triangleStartIndex);
                //for (let i = 0; i < this.triangles[x].getPath().getLength(); i++) {
                    let xy = this.triangles[x].getPath().getAt(0).toUrlValue(7).split(",");
                    // 
                    triangleStartPolygonPoint = {lat: xy[0], lng: xy[1]};
                    console.log(triangleStartPolygonPoint);
                    for (let x in this.cleanPoints) {
                        let cleanPoint = {lat: this.cleanPoints[x].lat, lng: llaPoints[x].lng};
                        //console.log(cleanPoint);
                        if (cleanPoint.lat == triangleStartPolygonPoint.lat && cleanPoint.lng == triangleStartPolygonPoint.lng)
                            routeStartIndex = x;
                            routeCurrentIndex = x;
                        }
                    console.log("RouteStartIndex: " + routeStartIndex); 
                    console.log("RouteCurrentIndex: " + routeCurrentIndex); 
                    console.log("TriangleCurrentIndex: " + triangleCurrentIndex);
                //}                
            }
            if (google.maps.geometry.poly.containsLocation(routeEndPoint, this.triangles[x]) == true) {
                console.log("CONTAINSLOCATION END");
                triangleEndIndex = x;
                //for (let i = 0; i < this.triangles[x].getPath().getLength(); i++) {
                    let xy = this.triangles[x].getPath().getAt(0).toUrlValue(7).split(",");
                    // 
                    triangleEndPolygonPoint = {lat: xy[0], lng: xy[1]};
                    console.log(triangleEndPolygonPoint);
                    for (let x in this.cleanPoints) {
                        let cleanPoint = {lat: this.cleanPoints[x].lat, lng: llaPoints[x].lng};
                        //console.log(cleanPoint);
                        if (cleanPoint.lat == triangleEndPolygonPoint.lat && cleanPoint.lng == triangleEndPolygonPoint.lng)
                            routeEndIndex = +x;
                    }
                    console.log("RouteEndIndex: " + routeEndIndex);
                    console.log("TriangleEndIndex: " + triangleEndIndex);
                //}                
            }
        }

        // iterate through all points in routing polygon FUNNEL ALGORITHM
        let currentCleanLength = this.cleanPoints.length;

        let savePointClock;
        let savePointDeClock;
        let routingPathsClock: any[] = [];
        let routingPathsDeClock: any[] = [];
        let routingIndexClock;
        let routingIndexDeClock;

        // set startPoint as savePoint for both directions

        // line intersect points
        let currentRoutePointClock, nextRoutePointClock,
        prevCleanPointClock, nextCleanPointClock,
        currentRoutePointDeClock, nextRoutePointDeClock,
        prevCleanPointDeClock, nextCleanPointDeClock;

        // push starting location to routingPaths
        routingPathsClock.push({lat: routeStartPoint.lat(), lng: routeStartPoint.lng()});
        routingPathsDeClock.push({lat: routeStartPoint.lat(), lng: routeStartPoint.lng()});

        let indexClock = routeStartIndex;
        let indexDeClock = routeStartIndex;

        console.log("START CLOCK: " + indexClock);
        console.log(this.cleanPoints[indexClock]);

        // iterate through cleanPoints
        for (let i = 0; i < currentCleanLength; i++) {   
            console.log("RoutingPaths Clock");
            for (let x in routingPathsClock) console.log(routingPathsClock[x]);
            console.log("RoutingPaths DeClock");
            for (let x in routingPathsDeClock) console.log(routingPathsDeClock[x]);         
            
            //console.log("For Start - IndexClock: " + indexClock, " IndexDeClock: " + indexDeClock);

            //console.log("Set Points");

            // set current routing Point Index
            routingIndexClock = routingPathsClock.length - 1;
            routingIndexDeClock = routingPathsDeClock.length - 1;

            //console.log("Routing Index Clock: " + routingIndexClock + ", DeClock: " + routingIndexDeClock);

            // set previous Clean Points
            let prevCleanPointClock = {lat: this.cleanPoints[indexClock].lat, lng: this.cleanPoints[indexClock].lng};
            let prevCleanPointDeClock = {lat: this.cleanPoints[indexDeClock].lat, lng: this.cleanPoints[indexDeClock].lng};

            indexClock++;
            indexDeClock--;

            //console.log("For IncDec - IndexClock: " + indexClock, " IndexDeClock: " + indexDeClock);

            if (indexClock === currentCleanLength - 1) indexClock = 0;
            if (indexDeClock === 0) indexDeClock = currentCleanLength - 1; 

            //console.log("For Check - IndexClock: " + indexClock, " IndexDeClock: " + indexDeClock);
            
            // set next Clean Points
            let nextCleanPointClock = {lat: this.cleanPoints[indexClock].lat, lng: this.cleanPoints[indexClock].lng};   
            let nextCleanPointDeClock = {lat: this.cleanPoints[indexDeClock].lat, lng: this.cleanPoints[indexDeClock].lng};
            
            // check if to finish route
            let finalPointClock = new google.maps.LatLng(parseFloat(prevCleanPointClock.lat), parseFloat(prevCleanPointClock.lng));
            let finalPointDeClock = new google.maps.LatLng(parseFloat(prevCleanPointDeClock.lat), parseFloat(prevCleanPointDeClock.lng));
            //console.log("Finish route?");
            if (google.maps.geometry.poly.containsLocation(finalPointClock, this.triangles[triangleEndIndex])) {
                console.log("Finish Clock: " + google.maps.geometry.poly.containsLocation(finalPointClock, this.triangles[triangleEndIndex]));
                routingPathsClock.push({lat: routeEndPoint.lat(), lng: routeEndPoint.lng()});
                let polyline = new google.maps.Polyline();
                polyline.setOptions(this.mapService.createPolylineRouteOptions(routingPathsClock));
                polyline.setMap(this.map);
                break;
            }
            if (google.maps.geometry.poly.containsLocation(finalPointDeClock, this.triangles[triangleEndIndex])) {
                console.log("Finish DeClock: " + google.maps.geometry.poly.containsLocation(finalPointDeClock, this.triangles[triangleEndIndex]));
                routingPathsClock.push({lat: routeEndPoint.lat(), lng: routeEndPoint.lng()});
                let polyline = new google.maps.Polyline();
                polyline.setOptions(this.mapService.createPolylineRouteOptions(routingPathsDeClock));
                polyline.setMap(this.map);
                break;
            }

            console.log("Intersect");
            let intersectPolygonPathsClock: any[] = [];
            intersectPolygonPathsClock.push(routingPathsClock[routingIndexClock]);
            intersectPolygonPathsClock.push({lat: parseFloat(prevCleanPointClock.lat), lng: parseFloat(prevCleanPointClock.lng)});
            intersectPolygonPathsClock.push({lat: parseFloat(nextCleanPointClock.lat), lng: parseFloat(nextCleanPointClock.lng)});
            for (let x in intersectPolygonPathsClock) console.log(intersectPolygonPathsClock[x]);
            /* let intersectPolygon = new google.maps.Polygon();
            intersectPolygon.setOptions(this.mapService.createPolygonTestOptions(intersectPolygonPaths)); */            
            let intersectCentroidClock = this.mapService.getPolygonCentroid(intersectPolygonPathsClock);
            let intersectCentroidClockLatLng = new google.maps.LatLng(parseFloat(intersectCentroidClock.lat), parseFloat(intersectCentroidClock.lng));

            let intersectPolygonPathsDeClock: any[] = [];
            intersectPolygonPathsDeClock.push(routingPathsDeClock[routingIndexDeClock]);
            intersectPolygonPathsDeClock.push({lat: parseFloat(prevCleanPointDeClock.lat), lng: parseFloat(prevCleanPointDeClock.lng)});
            intersectPolygonPathsDeClock.push({lat: parseFloat(nextCleanPointDeClock.lat), lng: parseFloat(nextCleanPointDeClock.lng)});
            // let intersectPolygon = new google.maps.Polygon();
            // intersectPolygon.setOptions(this.mapService.createPolygonTestOptions(intersectPolygonPaths));            
            let intersectCentroidDeClock = this.mapService.getPolygonCentroid(intersectPolygonPathsDeClock);
            let intersectCentroidDeClockLatLng = new google.maps.LatLng(parseFloat(intersectCentroidDeClock.lat), parseFloat(intersectCentroidDeClock.lng));

            if (!google.maps.geometry.poly.containsLocation(intersectCentroidClockLatLng, cleanPolygon)) {
                console.log("Intersect Clock!");
                routingPathsClock.push({lat: parseFloat(prevCleanPointClock.lat), lng: parseFloat(prevCleanPointClock.lng)});
            }

            if (!google.maps.geometry.poly.containsLocation(intersectCentroidDeClockLatLng, cleanPolygon)) {
                console.log("Intersect DeClock!");
                routingPathsDeClock.push({lat: parseFloat(prevCleanPointDeClock.lat), lng: parseFloat(prevCleanPointDeClock.lng)});
            }

            /* // routing line from current path point to next clean point CLOCK
            currentRoutePointClock = this.mapService.LLAtoECEF(routingPathsClock[routingIndexClock].lat, routingPathsClock[routingIndexClock].lng, "38");
            nextRoutePointClock = this.mapService.LLAtoECEF(this.cleanPoints[indexClock].lat, this.cleanPoints[indexClock].lng, "38");

            // edge line from current Clean point to next clean point CLOCK
            let prevCleanPointClockECEF = this.mapService.LLAtoECEF(prevCleanPointClock.lat, prevCleanPointClock.lng, "38");
            let nextCleanPointClockECEF = this.mapService.LLAtoECEF(nextCleanPointClock.lat, nextCleanPointClock.lng, "38");

            // routing line from current path point to next clean point DECLOCK
            currentRoutePointDeClock = this.mapService.LLAtoECEF(routingPathsClock[routingIndexDeClock].lat, routingPathsClock[routingIndexDeClock].lng, "38");
            nextRoutePointDeClock = this.mapService.LLAtoECEF(this.cleanPoints[indexDeClock].lat, this.cleanPoints[indexDeClock].lng, "38");

            // edge line from current Clean point to next clean point DECLOCK
            let prevCleanPointDeClockECEF = this.mapService.LLAtoECEF(prevCleanPointDeClock.lat, prevCleanPointDeClock.lng, "38");
            let nextCleanPointDeClockECEF = this.mapService.LLAtoECEF(nextCleanPointDeClock.lat, nextCleanPointDeClock.lng, "38");

            // polyline centroid clock and declock
            let routingLineCentroidClock = this.mapService.getPolylineCentroid(routingPathsClock[routingIndexClock], nextCleanPointClock);
            let routingLineMidPointClock = new google.maps.LatLng(parseFloat(routingLineCentroidClock.lat), parseFloat(routingLineCentroidClock.lng));

            let routingLineCentroidDeClock = this.mapService.getPolylineCentroid(routingPathsClock[routingIndexDeClock], nextCleanPointDeClock);
            let routingLineMidPointDeClock = new google.maps.LatLng(parseFloat(routingLineCentroidDeClock.lat), parseFloat(routingLineCentroidDeClock.lng));

            // check if clock and declock intersect, if intersect add last cleanpoint
            if (this.mapService.lineIntersect(routingPathsClock[routingIndexClock].lat, routingPathsClock[routingIndexClock].lng,
                                              this.cleanPoints[indexClock].lat, this.cleanPoints[indexClock].lng,
                                              prevCleanPointClock.lat, prevCleanPointClock.lng, 
                                              nextCleanPointClock.lat, nextCleanPointClock.lng)
                                            || !google.maps.geometry.poly.containsLocation(routingPathsClock[routingIndexClock], cleanPolygon)
                                            || !google.maps.geometry.poly.containsLocation(nextCleanPointClock, cleanPolygon)) { 
                console.log("Contains Clock: " + google.maps.geometry.poly.containsLocation(routingLineMidPointClock, cleanPolygon));
                routingPathsClock.push({lat: parseFloat(prevCleanPointClock.lat), lng: parseFloat(prevCleanPointClock.lng)});
            }
            if (this.mapService.lineIntersect(routingPathsDeClock[routingIndexDeClock].lat, routingPathsDeClock[routingIndexDeClock].lng,
                                              this.cleanPoints[indexDeClock].lat, this.cleanPoints[indexDeClock].lng,
                                              prevCleanPointDeClock.lat, prevCleanPointDeClock.lng, 
                                              nextCleanPointDeClock.lat, nextCleanPointDeClock.lng)
                                            || !google.maps.geometry.poly.containsLocation(routingPathsDeClock[routingIndexDeClock], cleanPolygon)
                                            || !google.maps.geometry.poly.containsLocation(nextCleanPointDeClock, cleanPolygon)) { 
                console.log("Contains DeClock: " + google.maps.geometry.poly.containsLocation(routingLineMidPointDeClock, cleanPolygon));                                                 
                routingPathsDeClock.push({lat: parseFloat(prevCleanPointDeClock.lat), lng: parseFloat(prevCleanPointDeClock.lng)});
            } */
            /* if (this.mapService.lineIntersect(currentRoutePointClock[0], currentRoutePointClock[1], nextRoutePointClock[0], nextRoutePointClock[1],
                                              prevCleanPointClockECEF[0], prevCleanPointClockECEF[1], nextCleanPointClockECEF[0], nextCleanPointClockECEF[1])
                                            || !google.maps.geometry.poly.containsLocation(routingLineMidPointClock, cleanPolygon)) { 
                console.log("Intersect Clock!");
                routingPathsClock.push({lat: parseFloat(prevCleanPointClock.lat), lng: parseFloat(prevCleanPointClock.lng)});
            }
            if (this.mapService.lineIntersect(currentRoutePointDeClock[0], currentRoutePointDeClock[1], nextRoutePointDeClock[0], nextRoutePointDeClock[1],
                                              prevCleanPointDeClockECEF[0], prevCleanPointDeClockECEF[1], nextCleanPointDeClockECEF[0], nextCleanPointDeClockECEF[1])
                                            || !google.maps.geometry.poly.containsLocation(routingLineMidPointDeClock, cleanPolygon)) { 
                console.log("Intersect DeClock!");                                                 
                routingPathsDeClock.push({lat: parseFloat(prevCleanPointDeClock.lat), lng: parseFloat(prevCleanPointDeClock.lng)});
            } */
            // check if clock and declock containsLocation of routingPolygon


            // check in which triangles cleanPoint is located containsLocation

            // check each triangle if 2 points same like 2 points in current triangle
            // set new triangle as currentTriangle
        }
    }   





    // ############################## heading test
    testHeading() {
        let testPaths: any[] = [];
        testPaths.push(new google.maps.LatLng(52.545714, 13.352478));
        testPaths.push(new google.maps.LatLng(52.545603, 13.352300));
        testPaths.push(new google.maps.LatLng(52.545733, 13.351869));

        let testPolygon = new google.maps.Polygon();
        testPolygon.setOptions(this.mapService.createPolygonTestOptions(testPaths));

        let testPoint = new google.maps.LatLng(52.545714, 13.352478);
        console.log("TestPoint: " + testPoint.lat() + ", " + testPoint.lng());

        let testBool = google.maps.geometry.poly.containsLocation(testPoint, testPolygon);
        console.log("TEST CONTAIN: " + testBool);

        // intersect
        let l1p1 = {lat: 52.545889, lng: 13.352048};
        let l1p2 = {lat: 52.545681, lng: 13.352055};
        //let l2p1 = {lat: 52.545849, lng: 13.351784};
        //let l2p2 = {lat: 52.545826, lng: 13.352226};

        let l2p1 = {lat: 52.545998, lng: 13.351766};
        let l2p2 = {lat: 52.546002, lng: 13.351365};

        console.log("Intersect LLA: " + this.mapService.lineIntersect(l1p1.lat, l1p1.lng, l1p2.lat, l1p2.lng, l2p1.lat, l2p1.lng, l2p2.lat, l2p2.lng));

        let l1p1e = this.mapService.LLAtoECEF(l1p1.lat, l1p1.lng, "38");
        let l1p2e = this.mapService.LLAtoECEF(l1p2.lat, l1p2.lng, "38");
        let l2p1e = this.mapService.LLAtoECEF(l2p1.lat, l2p1.lng, "38");
        let l2p2e = this.mapService.LLAtoECEF(l2p2.lat, l2p2.lng, "38");

        console.log("Intersect ECEF: " + this.mapService.lineIntersect(l1p1e[0], l1p1e[1], l1p2e[0], l1p2e[1], l2p1e[0], l2p1e[1], l2p2e[0], l2p2e[1]));

        console.log("Polyline centroid");
        console.log(this.mapService.getPolylineCentroid(l1p1, l1p2));

        

        this.headingPoints = [];
        this.headingPoints.push(new google.maps.LatLng(52.545725, 13.352059));
        this.headingPoints.push(new google.maps.LatLng(52.545716, 13.352260));
        this.headingPoints.push(new google.maps.LatLng(52.545714, 13.352478));
        this.headingPoints.push(new google.maps.LatLng(52.545603, 13.352300));
        this.headingPoints.push(new google.maps.LatLng(52.545733, 13.351869));

        for (let x in this.headingPoints) console.log(this.headingPoints[x]);

        let headings: any[] = [];

        for (let i = 0; i < this.headingPoints.length; i++) {
            if (i == this.headingPoints.length - 1) {
                headings.push(google.maps.geometry.spherical.computeHeading(this.headingPoints[i], this.headingPoints[0]));
            } else {
                headings.push(google.maps.geometry.spherical.computeHeading(this.headingPoints[i], this.headingPoints[i + 1]));
            }
        }

        for (let x in headings) console.log(headings[x]);

        this.cleanPoints = [];
        for (let i = 0; i < headings.length; i++) {
            if (i == 0) {
                let diff = headings[i] - headings[headings.length - 1];
                if (this.mapService.checkBearingDifference(diff) == true) this.cleanPoints.push({lat: this.headingPoints[i].lat(), lng: this.headingPoints[i].lng()});  
            } else {
                let diff = headings[i] - headings[i - 1];
                if (this.mapService.checkBearingDifference(diff) == true) this.cleanPoints.push({lat: this.headingPoints[i].lat(), lng: this.headingPoints[i].lng()});  
            }
        }  

        for (let x in this.cleanPoints) console.log(this.cleanPoints[x]);
        console.log("Clean length: " + this.cleanPoints.length);
    }

    public getLatLngFromString(path: String) {
        let latLngOrg = path.replace(/[()]/g, '');
        let latLng = latLngOrg.split(',');
         //console.log(latlang);
        return new google.maps.LatLng(parseFloat(latLng[0]) , parseFloat(latLng[1]));
    }

    public testBearing() {
        let point1 = {lat: 52.545794, lng: 13.352094};
        //let point2 = {lat: 52.545713, lng: 13.352326};
        let point2 = {lat: 52.545955, lng: 13.351988};
        this.mapService.calcBearing(point1, point2);
        
    }
}
