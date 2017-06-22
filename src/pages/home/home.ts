import { Component, ViewChild, ElementRef, trigger, state, style, animate, transition } from '@angular/core';
import { NavController, Platform } from 'ionic-angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
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
    ]
})

export class HomePage {

    @ViewChild('map') mapelement: ElementRef;
    map: any;
    public listViewState = 'out';
    public allrooms: any[] = [];
    public selectedRoom: any[] = [];
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

    public currentPosition;

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
        this.initializeRooms();        
    }

    ionViewDidLoad() {
        this.platform.ready().then(() => {   
            // placeholder: function to get nearest building
            let floortype = "d00";  
            this.loadMap(floortype);
            //this.getElevation(52.545090, 13.351338);
            //this.getCurrentPositionGPS();

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

            // Beacons            
            this.beaconService.setupBeacons();    
            //setTimeout(() => { this.beaconService.startRangingBeacons(); }, 3000);    
            this.beaconService.startRangingBeacons();

            // Interval positioning from available methods
            setInterval(() => { 
                this.checkBeacons();
                if (this.beacons.length > 2) {
                    this.getCurrentPositionBeacons();
                } else {
                    this.getCurrentPositionGPS();
                }
             }, 3000);
        });
    }

    public toggleListView() {
        this.listViewState = (this.listViewState == 'out') ? 'in' : 'out';
        console.log("STATE: " + this.listViewState);
    }

    public listViewIn() {
        this.listViewState = 'in';
    }

    public listViewOut() {
        this.listViewState = 'out';
    }

    public initializeRooms() {    
        this.dbService.selectRoomList().then(data => {
            this.allrooms = data;
        });

    }

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

    public loadMap(floor: any) { 
        this.loadMapStyles();        
        
        // SQLite Code with Observable
        //this.dbService.selectRooms("d00").subscribe(data => {  
        this.dbService.selectRooms("d01Attr", "d01Coords").subscribe(data => {
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

                // not working !?!?
                /*google.maps.event.addListener(polygon, 'click', function (event) {
                    let infoWindow = new google.maps.InfoWindow({
                        content: room.desc
                        
                    });

                    let polyAllCoordinates: any[] = [];
                    let polyCoordinates: any[] = room.coordinates.split("; ");

                    polyAllCoordinates = this.mapService.splitCoordinatesToLatLng(polyCoordinates);

                    let polyCentroid: any = {lat: 0, lng: 0};
                    polyCentroid = this.mapService.getPolygonCentroid(polyAllCoordinates);

                    console.log("CLICK CENTROID: " + polyCentroid)                
                    //infoWindow.open(this.map, centroid);
                });  */
            }    
        })  
    }   

    public getMapZoom() {
        return this.map.getZoom();
    }

    public getRoomInfo(event: any) {
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

    public selectRoom(room: any) {
        console.log("Selected room.name: " + room.name);        

        // Observable SQLite Code
        this.dbService.selectRoom(room.name, room.table).subscribe(data => {
            let mapRoomAllCoordinates: any[] = [];
            let mapRoomCoordinates: any[] = data.coordinates.split("; ");

            mapRoomAllCoordinates = this.mapService.splitCoordinatesToLatLng(mapRoomCoordinates);

            let mapRoomCentroid: any = {lat: 0, lng: 0};
            mapRoomCentroid = this.mapService.getPolygonCentroid(mapRoomAllCoordinates);

            if (this.listViewState == 'in') {
                this.toggleListView();
            }
            this.addMarker(mapRoomCentroid, data.desc);
        });
    }

    public addMarker(centroid: any, content: any) {
        if (this.marker != null) {
            this.marker.setMap(null);
        }        
        this.marker = new google.maps.Marker({
            map: this.map,
            animation: google.maps.Animation.DROP,
            position: { lat: +centroid.lat, lng: +centroid.lng }
        });

        this.addInfoWindow(this.marker, content);
        let center = new google.maps.LatLng(+centroid.lat, +centroid.lng);
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
        if (this.circle != null) {
            this.circle.setMap(null);
        } 
        this.geolocation.getCurrentPosition({timeout: 5000, enableHighAccuracy:true}).then((position) => {
            console.log("GPS POSITION: " + position.coords.latitude + ", " + position.coords.longitude);
            let center = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);            
            let positionLatLng = {lat: position.coords.latitude, lng: position.coords.longitude}
            this.circle = new google.maps.Circle();            
            this.circle.setOptions(this.mapService.createCircleOptions(positionLatLng, (this.mapService.getCircleRadius(this.getMapZoom()).toFixed(4))));
            this.circle.setMap(this.map);
            // using global variable:
            this.map.panTo(center);
        }, (error) => {
            console.log("" + error);
        });
    } 

    // testing
    public compassRouting() {
        let startPosition;
        this.mapService.getCurrentPositionGPS().subscribe(data => {
            startPosition = data;
            console.log("CR:")
            console.log(startPosition);
            console.log("GPS POSITION 1: " + startPosition[0] + ", " + startPosition[1]);
            this.startCompassRouting(startPosition);
        });
        console.log("GPS POSITION 2: " + startPosition[0] + ", " + startPosition[1]);
        console.log("FINISH");
    }

    public startCompassRouting(startPosition) {
        this.compassPts = [];
        this.currentPosition = startPosition[0] + ", " + startPosition[1];
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
        let latLngPts = this.mapService.splitCoordinatesToLatLng(points);
        this.polyline = new google.maps.Polyline();
        this.polyline.setOptions(this.mapService.createPolylineOptions(latLngPts));
        this.polyline.setMap(this.map);
        let center = new google.maps.LatLng(latLngPts[latLngPts.length-1].lat, latLngPts[latLngPts.length-1].lng);
        this.map.panTo(center);

        let lengthInMeters = google.maps.geometry.spherical.computeLength(this.polyline.getPath());
        console.log("Polyline length: " + lengthInMeters);
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
        console.log("CURRENT Positon Beacons.")
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
        console.log("Beacon Tri Position: " + triStr);
        let triStrK: any = this.mapService.trilaterate(this.triconsACC);
        console.log("Beacon Tri Position K: " + triStrK);
        let splitTriPt = triStr.split(", ");
        let center = new google.maps.LatLng(+splitTriPt[0], +splitTriPt[1]);
        let positionLatLng = {lat: +splitTriPt[0], lng: +splitTriPt[1]}
        this.circle = new google.maps.Circle();   
        this.circle.setOptions(this.mapService.createCircleOptions(positionLatLng, (+this.getMapZoom() / 6)));
        this.circle.setMap(this.map);
        // using global variable:
        this.map.panTo(center);
    }
}
