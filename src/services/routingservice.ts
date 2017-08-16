import { Injectable } from '@angular/core'; 
import { MapService } from './mapservice';
import { DatabaseService } from './databaseservice';

import * as earcut from 'earcut';
import * as math from 'mathjs';

declare let google;

@Injectable()
export class RoutingService { 
    public polygons: any[] = [];

    // testing
    public headingPoints: any[] = [];   
    public circleTest; 

    // routing variables    
    public triangles: any[] = [];
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

    constructor(private dbService: DatabaseService,
                private mapService: MapService) {
        
    }

    /**
     * Returns true if point lies inside polygon
     * @param point 
     * @param polygon 
     */
    public containsLocation(point: any, polygon: any) {
        return google.maps.geometry.poly.containsLocation(point, polygon);
    }

    /**
     * Returns distance between two LatLng points
     * @param pointA 
     * @param pointB 
     */
    public computeDistance(pointA: any, pointB: any) {
        return google.maps.geometry.spherical.computeDistanceBetween (pointA, pointB);
    }


    public createRouteInLevel(startPosition: any,
                              endPosition: any,
                              routingPolygons: any,
                              routingPoints: any) {
        console.log("Create route in level.");
        let rPaths: any[] = [];
        // set start and endpoint
        /* let rStart = {name: "Start", house: "Bauwesen", tier: 0, lat: 52.54567, lng: 13.35582};
        let rEnd = {name: "End", house: "Bauwesen", tier: 0, lat: 52.54548, lng: 13.35553}; */

        //let currentStart = {lng: "13.35535", lat: "52.54572"};
        let currentPolygonStart = null;
        let startLatLng = new google.maps.LatLng(parseFloat(startPosition.lat), parseFloat(startPosition.lng));

        //let routingStartLatLng = new google.maps.LatLng(parseFloat(currentStart.lat), parseFloat(currentStart.lng));

        let currentRoutingPolygonIndex = null;
        let currentRoutingPolygonName = null;
        let endRoutingPolygonIndex, endRoutingPolygonName;

        // set start routing polygon index, name and position
        for (let x in routingPolygons) {            
            if (this.containsLocation(startLatLng, routingPolygons[x].polygon)) {
                currentRoutingPolygonIndex = x;
                currentRoutingPolygonName = routingPolygons[x].name;
                currentPolygonStart = {lat: startPosition.lat, lng: startPosition.lng};
                break;
            }
        }

        // if currentPosition is none routing polygons, get nearest routing point
        /* try {
            if (currentPolygonStart == null && currentRoutingPolygonIndex == null && currentRoutingPolygonName == null) {
                for (let x in tablePoints) {
                    let currentStartDistances = this.sortByDistance(tablePoints, startLatLng);                                    
                    // nearest route point = start
                    currentPolygonStart = {lat: parseFloat(currentStartDistances[0].lat), lng: parseFloat(currentStartDistances[0].lng)};
                    startLatLng =  new google.maps.LatLng(parseFloat(currentPolygonStart.lat), (parseFloat(currentPolygonStart.lng)));
                }
                for (let x in routingPolygons) {   
                    if (this.containsLocation(startLatLng, routingPolygons[x].polygon)) {
                        currentRoutingPolygonIndex = routingPolygons[x].shapeid;
                        currentRoutingPolygonName = routingPolygons[x].name;
                    }
                }
            }
        } catch (e) { console.log("No start point for routing found: " + e) }; */

        //this.dbService.getRoutePointByName(tablePoints, routingEndName).subscribe(data => {
            //this.dbService.getRoutePointByName(this.attributes.tablePoints, this.attributes.name).subscribe(data => {
            
                let routingEndLatLng = new google.maps.LatLng(parseFloat(endPosition.lat), parseFloat(endPosition.lng));
    
                // set end routing polygon index and name
                for (let x in routingPolygons) {
                    if (this.containsLocation(routingEndLatLng, routingPolygons[x].polygon)) {
                        endRoutingPolygonIndex = x;
                        endRoutingPolygonName = routingPolygons[x].name;
                    }
                }
    
                let currentRoutingPolygon;               
    
                // check if start and end position is in same routing polygon  
                if (currentRoutingPolygonIndex != endRoutingPolygonIndex) {
                    let connectors: any[] = [];
                    console.log("Connectors:");
                    for (let x in routingPoints) {
                        if (routingPoints[x].type == "connect") {
                            connectors.push(routingPoints[x]);
                        }
                    }
                    while (currentRoutingPolygonIndex != endRoutingPolygonIndex) {
                        // get current routingPolygon by polygonIndex
                        currentRoutingPolygon = routingPolygons[currentRoutingPolygonIndex].polygon;
                        console.log("Current polygon index: " + currentRoutingPolygonIndex + ", End: " + endRoutingPolygonIndex);
    
                        // get connector name from polygon, calculate shortest distance to endPoint
                        let currentConnectors: any[] = [];
                        for (let x in routingPoints) {
                            if (routingPoints[x].name == currentRoutingPolygonName && routingPoints[x].type == "connect") currentConnectors.push(routingPoints[x]);
                        }      
                        let currentCNDistances = this.sortByDistance(currentConnectors, routingEndLatLng);
                                        
                        // nearest connection point = temporary end
                        let currentPolygonEnd = {lat: parseFloat(currentCNDistances[0].lat), lng: parseFloat(currentCNDistances[0].lng)};
                        let currentPolygonPaths = this.createRouteInPolygon(currentPolygonStart, currentPolygonEnd, currentRoutingPolygon);
    
                        // push paths to overall paths array
                        for (let x in currentPolygonPaths) rPaths.push(currentPolygonPaths[x]);
    
                        // calculate shortest distance connector to current polygon End
                        let currentPolygonEndLatLng = new google.maps.LatLng(currentPolygonEnd.lat, currentPolygonEnd.lng);
                        let CNCNDistances = this.sortByDistance(connectors, currentPolygonEndLatLng);
                        CNCNDistances.splice(0, 1); // remove identical connector
    
                        // set nearest connector neighbor to current polygon end
                        currentPolygonStart = {lat: CNCNDistances[0].lat + "", lng: CNCNDistances[0].lng + ""};
                        let currentStartLatLng = new google.maps.LatLng(parseFloat(currentPolygonStart.lat), parseFloat(currentPolygonStart.lng));
    
                        // set new routing polygon for next loop
                        for (let x in routingPolygons) {
                            if (this.containsLocation(currentStartLatLng, routingPolygons[x].polygon)) {
                                currentRoutingPolygonIndex = x;
                                currentRoutingPolygonName = routingPolygons[x].name;
                            }
                        }
                        if (currentRoutingPolygonIndex == endRoutingPolygonIndex) {
                            console.log("Finish while loop.");
                            let endPolygon = routingPolygons[currentRoutingPolygonIndex].polygon;
                            let endPolygonPaths = this.createRouteInPolygon(currentPolygonStart, endPosition, endPolygon);
                            for (let x in endPolygonPaths) rPaths.push(endPolygonPaths[x]);
                        }
                    }
                } else {
                    currentRoutingPolygon = routingPolygons[currentRoutingPolygonIndex].polygon;
                    rPaths = this.createRouteInPolygon(currentPolygonStart, endPosition, currentRoutingPolygon);
                }            
                // ### TODO: check if start and end position is in same house and tier
                
                // ### TODO: determine routing polygon (index)
                //routingPolygonIndex = 84;
                
                return rPaths;
            //});
    }

    public createRouteInPolygon(startPosition, endPosition, routingPolygon) {
        // Reset routing and intersect paths, clock and counter-clock
        this.rPathsC = [];
        this.rPathsCC = [];
        this.iPathsC = [];
        this.iPathsCC = [];

        // ### TODO clean routing polyline from map
        if (this.triangles != null) {
            for (let x in this.triangles) {
                 this.triangles[x].setMap(null);            
            }
            this.triangles = [];
        }      

        // Set start and end position for this loop
        let rStart = new google.maps.LatLng(parseFloat(startPosition.lat), parseFloat(startPosition.lng));
        let rEnd = new google.maps.LatLng(parseFloat(endPosition.lat), parseFloat(endPosition.lng));

        // Add all polygon points to array
        let pPathsRaw: any[] = [];
        let routingPolygonLength = routingPolygon.getPath().getLength();

        for (let i = 0; i < routingPolygonLength; i++) {
            let pLatLng = routingPolygon.getPath().getAt(i).toUrlValue(7).split(",");
            pPathsRaw.push({lat: pLatLng[0], lng: pLatLng[1]});
        }             
        console.log("Raw pPaths length: " + pPathsRaw.length);
        
        // Remove Laeuferpunkte from input polygon
        this.pPaths = [];
        this.pPaths = this.removeLaeuferpunkte(pPathsRaw);

        // Create invisible background true polygon for intersection check
        console.log("Clean pPaths length: " + this.pPaths.length);
        this.routingPolygon = new google.maps.Polygon();
        this.routingPolygon.setOptions(this.mapService.createPolygonBuildingOptions(this.pPaths));  
        
        // Create triangle points
        let ePoints: any[] = [];
        let tPointsECEF: any[] = [];
        for (let x in this.pPaths) {
            let ePoint = this.mapService.LLAtoECEF(this.pPaths[x].lat, this.pPaths[x].lng, this.pPaths[x].elevation);
            ePoints.push(ePoint);
            tPointsECEF.push(ePoint[0]);
            tPointsECEF.push(ePoint[1]);
        }
        console.log("ePoints length: " + ePoints.length);
        console.log("tPointsECEF length: " + tPointsECEF.length);

        // Get indices for earcut triangulation
        
        //let indices = this.mapService.testEarcut(tPointsECEF);
        let indices = earcut(tPointsECEF);
                
        // Create triangle points array through indices iteration
        let tPoints: any[] = [];
        for (let x in indices) tPoints.push(this.mapService.ECEFtoLLA(ePoints[indices[x]][0], ePoints[indices[x]][1], ePoints[indices[x]][2]));
        console.log("tPoints length: " + tPoints.length);

        // Iterate through all triangle points and create triangle polygons
        this.triangles = this.createTriangles(tPoints);

        console.log("Triangles length: " + this.triangles.length);  

        // Determine startPointTriangle and endPointTriangle for startPosition and endPosition
        let routingIndices = this.getRoutingIndices(rStart, rEnd);
        let rStartIndex, rEndIndex, tEndIndex;
        rStartIndex = routingIndices[0];
        tEndIndex = routingIndices[1];
        console.log("triangleEndIndex: " + tEndIndex);

        // Push starting location to routingPath and intersectPath arrays
        this.rPathsC.push({lat: rStart.lat(), lng: rStart.lng()});
        this.rPathsCC.push({lat: rStart.lat(), lng: rStart.lng()});
        this.iPathsC.push({lat: rStart.lat(), lng: rStart.lng()});
        this.iPathsCC.push({lat: rStart.lat(), lng: rStart.lng()});        

        // Set startIndex for both directions
        let indexC = rStartIndex;
        let indexCC = rStartIndex;
        console.log("indexC: " + indexC + ", CC: " + indexCC);

        // Push first triangle point into iPaths
        /* this.iPathsC.push({lat: parseFloat(pPaths[indexC].lat), lng: parseFloat(pPaths[indexC].lng)});
        this.iPathsCC.push({lat: parseFloat(pPaths[indexCC].lat), lng: parseFloat(pPaths[indexCC].lng)}); */

        console.log("#######################################");
        // Iterate through all routingPolygon vertices (Funnel algorithm)
        let pLength = this.pPaths.length;
        for (let i = 1; i < pLength; i++) {  
            let rLengthC = this.rPathsC.length;
            let rLengthCC = this.rPathsCC.length;   

            // prev Vertex
            let pIndexC = indexC - 1;
            if (pIndexC < 0) pIndexC = pLength - 1; 
            let prevVertexC = {lat: parseFloat(this.pPaths[pIndexC].lat), lng: parseFloat(this.pPaths[pIndexC].lng)};
            let pIndexCC = indexCC + 1;
            if (pIndexCC > pLength - 1) pIndexCC = 0; 
            let prevVertexCC = {lat: parseFloat(this.pPaths[pIndexCC].lat), lng: parseFloat(this.pPaths[pIndexCC].lng)};

            // current Vertex
            let currVertexC = {lat: parseFloat(this.pPaths[indexC].lat), lng: parseFloat(this.pPaths[indexC].lng)};
            let currVertexCC = {lat: parseFloat(this.pPaths[indexCC].lat), lng: parseFloat(this.pPaths[indexCC].lng)};
            
            // Increase and decrease indices to go through routingPolygon vertices in both directions
            indexC++;
            indexCC--;  

            // If out of bound: reset index
            if (indexC > pLength - 1) indexC = 0;
            if (indexCC < 0) indexCC = pLength - 1; 

            // Splice prevVertex out of intersectPaths for next intersection check
            if (this.iPathsC.length > 1) this.iPathsC.splice(1, 1);
            if (this.iPathsCC.length > 1) this.iPathsCC.splice(1, 1);
            
            // Push nextVertex to intersect vertices array
            this.iPathsC.push({lat: parseFloat(this.pPaths[indexC].lat), lng: parseFloat(this.pPaths[indexC].lng)});
            this.iPathsCC.push({lat: parseFloat(this.pPaths[indexCC].lat), lng: parseFloat(this.pPaths[indexCC].lng)});

            // Intersect paths length
            let iLengthC = this.iPathsC.length;
            let iLengthCC = this.iPathsCC.length;
            
            // Finish routing algorithm if current routingPolygonPath reached endTriangle
            let pEndC = new google.maps.LatLng(parseFloat(this.iPathsC[this.iPathsC.length - 1].lat), parseFloat(this.iPathsC[this.iPathsC.length - 1].lng));
            let pEndCC = new google.maps.LatLng(parseFloat(this.iPathsCC[this.iPathsCC.length - 1].lat), parseFloat(this.iPathsCC[this.iPathsCC.length - 1].lng));
            
            if (google.maps.geometry.poly.containsLocation(pEndC, this.triangles[tEndIndex])) {
                console.log("Finish C: " + google.maps.geometry.poly.containsLocation(pEndC, this.triangles[tEndIndex]) + ", " + tEndIndex);

                let continueVertex = null;
                // 1st check
                let next1 = {lat: parseFloat(this.pPaths[indexC].lat), lng: parseFloat(this.pPaths[indexC].lng)};
                let intersectC1 = this.getNextRoutingPath(this.pPaths, this.iPathsC, prevVertexC, currVertexC, next1, continueVertex);
                if (intersectC1 != null) {
                    console.log("Intersection at IndexC: " + indexC);
                    this.rPathsC.push(intersectC1);
                }       
                // 2nd check
                let fPrev = currVertexC;
                let fCurr = {lat: parseFloat(this.pPaths[indexC].lat), lng: parseFloat(this.pPaths[indexC].lng)};
                // ##########
                let nIndexC = indexC + 1;
                if (nIndexC > pLength - 1) nIndexC = 0; 
                let fNext = {lat: parseFloat(this.pPaths[nIndexC].lat), lng: parseFloat(this.pPaths[nIndexC].lng)};
                
                // ##########
                this.iPathsC = [];
                this.iPathsC.push({lat: parseFloat(this.rPathsC[this.rPathsC.length - 1].lat), lng: parseFloat(this.rPathsC[this.rPathsC.length - 1].lng)});
                this.iPathsC.push({lat: rEnd.lat(), lng: rEnd.lng()});
                let intersectC2 = this.getNextRoutingPath(this.pPaths, this.iPathsC, fPrev, fCurr, fNext, continueVertex);
                if (intersectC2 != null) {
                    console.log("Intersection at IndexC: " + indexC);
                    this.rPathsC.push(intersectC2);
                }                
                this.rPathsC.push({lat: rEnd.lat(), lng: rEnd.lng()});
                for (let x in this.rPathsC) console.log(this.rPathsC[x]); 

                if (this.rPathsC.length > 2) return this.cleanFinalRoute(this.rPathsC);

                return this.rPathsC;
            }
            if (google.maps.geometry.poly.containsLocation(pEndCC, this.triangles[tEndIndex])) {
                console.log("Finish CC: " + google.maps.geometry.poly.containsLocation(pEndCC, this.triangles[tEndIndex]) + ", " + tEndIndex);

                let continueVertex = null;
                // 1st check
                let next1 = {lat: parseFloat(this.pPaths[indexCC].lat), lng: parseFloat(this.pPaths[indexCC].lng)};
                let intersectCC1 = this.getNextRoutingPath(this.pPaths, this.iPathsCC, prevVertexCC, currVertexCC, next1, continueVertex);
                if (intersectCC1 != null) {
                    console.log("Intersection at IndexCC: " + indexCC);
                    this.rPathsCC.push(intersectCC1);
                }       
                // 2nd check
                let fPrev = currVertexCC;
                let fCurr = {lat: parseFloat(this.pPaths[indexCC].lat), lng: parseFloat(this.pPaths[indexCC].lng)};
                // ##########
                let nIndexCC = indexCC - 1;
                if (nIndexCC < 0) nIndexCC = pLength - 1; 
                let fNext = {lat: parseFloat(this.pPaths[nIndexCC].lat), lng: parseFloat(this.pPaths[nIndexCC].lng)};
                
                // ##########
                this.iPathsCC = [];
                this.iPathsCC.push({lat: parseFloat(this.rPathsCC[this.rPathsCC.length - 1].lat), lng: parseFloat(this.rPathsCC[this.rPathsCC.length - 1].lng)});
                this.iPathsCC.push({lat: rEnd.lat(), lng: rEnd.lng()});
                let intersectCC2 = this.getNextRoutingPath(this.pPaths, this.iPathsCC, fPrev, fCurr, fNext, continueVertex);
                if (intersectCC2 != null) {
                    console.log("Intersection at IndexCC: " + indexCC);
                    this.rPathsCC.push(intersectCC2);
                }                
                this.rPathsCC.push({lat: rEnd.lat(), lng: rEnd.lng()});
                for (let x in this.rPathsCC) console.log(this.rPathsCC[x]);
                  
                if (this.rPathsCC.length > 2) return this.cleanFinalRoute(this.rPathsCC);
                return this.rPathsCC;
            }

            // Start intersection check for both directions
            if (this.iPathsC.length > 1) {
                //console.log("iPathsC.length: " + this.iPathsC.length);
                 // ##########
                let cIndexC = indexC - 1;
                if (cIndexC < 0) cIndexC = pLength - 1; 
                let continueVertex = {lat: parseFloat(this.pPaths[cIndexC].lat), lng: parseFloat(this.pPaths[cIndexC].lng)};
                // ##########
                let intersectC = this.getNextRoutingPath(this.pPaths, this.iPathsC, prevVertexC, currVertexC, this.iPathsC[1], continueVertex);
                if (intersectC != null) {
                    console.log("Intersection at IndexC: " + indexC);
                    this.rPathsC.push(intersectC);
                    this.iPathsC = [];
                    this.iPathsC.push(intersectC);
                }  
            } 
            if (this.iPathsCC.length > 1) {
                //console.log("iPathsCC.length: " + this.iPathsCC.length);
                // ##########
                let cIndexCC = indexCC - 1;
                if (cIndexCC < 0) cIndexCC = pLength - 1; 
                let continueVertex = {lat: parseFloat(this.pPaths[cIndexCC].lat), lng: parseFloat(this.pPaths[cIndexCC].lng)};
                // ##########
                let intersectCC = this.getNextRoutingPath(this.pPaths, this.iPathsCC, prevVertexCC, currVertexCC, this.iPathsCC[1], continueVertex);
                if (intersectCC != null) {
                    console.log("Intersection at IndexCC: " + indexCC);
                    this.rPathsCC.push(intersectCC);
                    this.iPathsCC = [];
                    this.iPathsCC.push(intersectCC);
                }  
            } 
        }
    }   

    /**
     * Returns new routing path if intersection is detected
     * @param pPaths 
     * @param iPaths 
     * @param prevVertex 
     * @param currVertex 
     * @param nextVertex 
     * @param continueVertex 
     */
    public getNextRoutingPath(pPaths: any, iPaths: any, prevVertex: any, currVertex: any, nextVertex: any, continueVertex: any) {  
        let length = iPaths.length;         
        
        // intersect check: new potential route path, iPaths length always = 3 / 2
        let i1 = {lat: parseFloat(iPaths[0].lat), lng: parseFloat(iPaths[0].lng)};
        //let i2 = {lat: parseFloat(iPaths[2].lat), lng: parseFloat(iPaths[2].lng)};        
        let i2 = {lat: parseFloat(iPaths[1].lat), lng: parseFloat(iPaths[1].lng)};     

        for (let i = 0; i < pPaths.length - 1; i++) {    
            // intersect check: all edges of pPaths
            let p1 = {lat: parseFloat(pPaths[i].lat), lng: parseFloat(pPaths[i].lng)};
            let p2 = {lat: parseFloat(pPaths[i + 1].lat), lng: parseFloat(pPaths[i + 1].lng)};

            if (this.getLineIntersection(p1.lat, p1.lng, p2.lat, p2.lng, i1.lat, i1.lng, i2.lat, i2.lng)) {               
                let direction1;
                let direction2;
                let heading1 = this.calcBearing(currVertex, prevVertex);
                let heading2 = this.calcBearing(currVertex, nextVertex);

                direction1 = Math.abs((heading1 + heading2) / 2);
                if (direction1 > 180) {
                    direction2 = Math.abs(direction1 - 180);
                } else {
                    direction2 = direction1 + 180;
                }
        
                let nP1 = this.mapService.getLatLngByAzimuthDistance(currVertex, 1, Math.abs(direction1));
                let nP2 = this.mapService.getLatLngByAzimuthDistance(currVertex, 1, Math.abs(direction2));
                let nP1LLA = new google.maps.LatLng(parseFloat(nP1.lat), parseFloat(nP1.lng));
                let nP2LLA = new google.maps.LatLng(parseFloat(nP2.lat), parseFloat(nP2.lng));

                if (google.maps.geometry.poly.containsLocation(nP1LLA, this.routingPolygon)) {
                    let newVertex = nP1; 

                    let testPath: any[] = [];
                    testPath.push(currVertex);
                    testPath.push(nP1);

                    return newVertex;         
                }

                if (google.maps.geometry.poly.containsLocation(nP2LLA, this.routingPolygon)) {
                    let newVertex = nP2; 
                    let testPath: any[] = [];
                    testPath.push(currVertex);
                    testPath.push(nP2);
                    
                    return newVertex;
                } else {
                    return currVertex;
                }
            }            
        }     
        return null;   
    }

    public cleanFinalRoute2(routePaths: any) {
        console.log("cleanFinalRoute");
        let rPaths: any[] = [];
        rPaths.push(routePaths[0]);

        let intersect = true;
        let index = 1; // starting with 1st point

        let lengthBefore = rPaths.length;
        let lengthAfter = 0;

        while (intersect) {       
            console.log("while");

            let intersects: any[] = [];

            for (let i = 1; i < rPaths.length - 1; i++) {
                let r1 = {lat: parseFloat(rPaths[rPaths.length - 1].lat), lng: parseFloat(rPaths[rPaths.length - 1].lng)};
                let r2 = {lat: parseFloat(rPaths[i + 1].lat), lng: parseFloat(rPaths[i + 1].lng)};

                for (let j = 0; j < this.pPaths.length - 1; j++) {    
                    // intersect check: all edges of pPaths
                    let p1 = {lat: parseFloat(this.pPaths[j].lat), lng: parseFloat(this.pPaths[j].lng)};
                    let p2 = {lat: parseFloat(this.pPaths[j + 1].lat), lng: parseFloat(this.pPaths[j + 1].lng)};                    

                    if (this.getLineIntersection(p1.lat, p1.lng, p2.lat, p2.lng, r1.lat, r1.lng, r2.lat, r2.lng)) {
                        intersects.push(true);
                        break;
                    }    
                    if (j == this.pPaths.length - 1) intersects.push(false);
                } 
            }

            for (let x in intersects) console.log(intersects[x]);

            let tPaths: any[] = [];

            for (let k = 0; k < intersects.length - 1; k++) {
                if (intersects[k] == false) {
                    tPaths.push(routePaths[k + index]);
                    for (let x in rPaths) console.log("rPaths: " + rPaths[x].lat + ", " + rPaths[x].lng);
                }
            }
            if (tPaths.length > 0) {
                console.log("index before: " + index);
                index = index + tPaths.length + 1;
                console.log("index after: " + index);
                rPaths.push(tPaths[tPaths.length - 1]);            
            }
        }
        
        return rPaths;
    }

    /**
     * 
     * @param routePaths 
     */
    public cleanFinalRoute(routePaths: any) {
        console.log("Cleaning route in polygon.")
        //for (let x in routePaths) console.log(routePaths[x].lat + ", " + routePaths[x].lng);
        let rPaths: any[] = [];
        rPaths = routePaths;
        let lengthBefore = rPaths.length;
        let lengthAfter = 0;     

        if (rPaths.length > 2) {
            while (lengthAfter != lengthBefore) {
                lengthBefore = rPaths.length; 
                let tPaths: any[] = []; 
                tPaths.push(rPaths[0]); // add start to temporary paths 
                for (let i = 1; i < lengthBefore - 1; i++) {
                    let r1 = {lat: parseFloat(rPaths[i - 1].lat), lng: parseFloat(rPaths[i - 1].lng)};
                    let r2 = {lat: parseFloat(rPaths[i + 1].lat), lng: parseFloat(rPaths[i + 1].lng)};
                    for (let j = 0; j < this.pPaths.length - 1; j++) {    
                        // intersect check: all edges of pPaths
                        let p1 = {lat: parseFloat(this.pPaths[j].lat), lng: parseFloat(this.pPaths[j].lng)};
                        let p2 = {lat: parseFloat(this.pPaths[j + 1].lat), lng: parseFloat(this.pPaths[j + 1].lng)};

                        if (this.getLineIntersection(p1.lat, p1.lng, p2.lat, p2.lng, r1.lat, r1.lng, r2.lat, r2.lng)) {   
                            tPaths.push({lat: parseFloat(rPaths[i].lat), lng: parseFloat(rPaths[i].lng)});
                            break;
                        }    
                    } 
                }    

                tPaths.push(rPaths[rPaths.length - 1]);
                
                rPaths = tPaths;
                lengthAfter = rPaths.length; 

                if (lengthAfter === lengthBefore) { 
                    //for (let x in rPaths) console.log(rPaths[x].lat + ", " + rPaths[x].lng);          
                    return rPaths;                    
                }                       
            }
        }
        return routePaths;
    }

    /**
     * Returns cleaned polygon without removed Laeuferpunkte from input polygon
     * @param pathsRaw 
     */
    public removeLaeuferpunkte(pathsRaw: any) {
        // Determine headings for all raw paths
        let pathsRawHeadings: any[] = [];
        for (let i = 0; i < pathsRaw.length; i++) {
            if (i == pathsRaw.length - 1) {
                pathsRawHeadings.push(this.calcBearing(pathsRaw[i], pathsRaw[0]));
            } else {
                pathsRawHeadings.push(this.calcBearing(pathsRaw[i], pathsRaw[i + 1]));
            }
        }

        // Exclude läuferpunkte from raw paths where
        // ### TODO: replace elevation with calculation or average by building
        let pathsClean: any[] = [];
        for (let i = 0; i < pathsRawHeadings.length; i++) {
            if (i == 0) {
                let diff = pathsRawHeadings[i] - pathsRawHeadings[pathsRawHeadings.length - 1];
                if (this.checkBearingDifference(diff)) {
                    pathsClean.push({lat: parseFloat(pathsRaw[i].lat), lng: parseFloat(pathsRaw[i].lng), elevation: "38"});
                }
            } else {
                let diff = pathsRawHeadings[i] - pathsRawHeadings[i - 1];
                if (this.checkBearingDifference(diff)) {
                    pathsClean.push({lat: parseFloat(pathsRaw[i].lat), lng: parseFloat(pathsRaw[i].lng), elevation: "38"}); 
                }
            }
        } 
        return pathsClean; 
    }

    /**
     * Calculates bearing between two geodetic points
     * @param point1
     * @param point2 
     */
    public calcBearing(point1, point2) {
        let p1Lat = this.mapService.getRadians(point1.lat),
        p1Lng = this.mapService.getRadians(point1.lng),
        p2Lat = this.mapService.getRadians(point2.lat),
        p2Lng = this.mapService.getRadians(point2.lng)

        let dLong = p2Lng - p1Lng;
        let dPhi = math.log(math.tan(p2Lat / 2.0 + math.pi / 4.0) / math.tan(p1Lat / 2.0 + math.pi / 4.0));

        if (math.abs(dLong) > math.pi) {
            if (dLong > 0.0) {
                dLong = -(2.0 * math.pi - dLong)
            } else {
                dLong = (2.0 * math.pi + dLong)
            }
        }

        let bearing = (this.mapService.getDegrees(math.atan2(dLong, dPhi)) + 360.0) % 360.0;
        //console.log("BEARING: " + bearing);
        return bearing;
    }

    /**
     * 
     * @param diff 
     * @param index 
     */
    public checkBearingDifference(diff) {
        if (Math.abs(diff) > 180) {
            diff = 360 - Math.abs(diff);
        } else {
             diff = Math.abs(diff);
        }
        //console.log("Bearing Difference: " + diff);
        if (diff > 10) {
            return true;                   
        }
        return false;
    }

    /**
     * Creates triangle polygons from triangulation
     * @param trianglePoints 
     */
    public createTriangles(trianglePoints: any) {
        // Iterate through all triangle points and create triangle polygons
        let triangles: any[] = [];
        for (let i = 0; i < trianglePoints.length; i += 3) {
            let trianglePathsLLA: any[] = [];
            trianglePathsLLA.push(trianglePoints[i]);
            trianglePathsLLA.push(trianglePoints[i + 1]);
            trianglePathsLLA.push(trianglePoints[i + 2]);
            let triangle = new google.maps.Polygon();
            triangle.setOptions(this.mapService.createTriangleOptions(trianglePathsLLA));
            //triangle.setMap(this.map);
            triangles.push(triangle);
        }
        return triangles;
    }

    /**
     * Returns starting vertex and end triangle indices
     * @param rStart 
     * @param rEnd 
     */
    public getRoutingIndices(rStart: any, rEnd: any) {
        let rStartIndex, tStartPP,
        rEndIndex, tEndPP, tEndIndex;
        // Determine startPointTriangle and endPointTriangle for startPosition and endPosition
        // ### TODO: change startIndex and endIndex to near neighbor?
        for (let x in this.triangles) {
            if (google.maps.geometry.poly.containsLocation(rStart, this.triangles[x]) == true) {
                console.log("TriangleStart: " + x);
                let tLatLng = this.triangles[x].getPath().getAt(0).toUrlValue(7).split(",");
                tStartPP = {lat: parseFloat(tLatLng[0]), lng: parseFloat(tLatLng[1])};
                console.log(tStartPP);
                for (let y in this.pPaths) {
                    let vertex = {lat: this.pPaths[y].lat, lng: this.pPaths[y].lng};
                    //console.log(cleanPoint);
                    if (vertex.lat == tStartPP.lat && vertex.lng == tStartPP.lng) {
                        console.log("IndexStart: " + y);
                        rStartIndex = y;
                        break;
                    }
                }
            }

            if (google.maps.geometry.poly.containsLocation(rEnd, this.triangles[x]) == true) {
                console.log("TriangleEnd: " + x);
                tEndIndex = x;
                let tLatLng = this.triangles[x].getPath().getAt(0).toUrlValue(7).split(",");
                /* tEndPP = {lat: parseFloat(tLatLng[0]), lng: parseFloat(tLatLng[1])};                
                //console.log("End Location: " + tEndPP.lat + ", " + tEndPP.lng);                
                for (let y in this.pPaths) {
                    let vertex = {lat: parseFloat(this.pPaths[y].lat), lng: parseFloat(this.pPaths[y].lng)};
                    //console.log(cleanPoint);
                    if (vertex.lat === tEndPP.lat && vertex.lng === tEndPP.lng) {
                        console.log("IndexEnd: " + y);
                        rEndIndex = y;
                        break;
                    }
                } */
            }
        }
        return [rStartIndex, tEndIndex];
    }

    /**
     * Returns sorted array list by distances
     * @param points 
     * @param point 
     * @param pointB 
     */
    public sortByDistance(points: any, point: any) {        
        let distances: any[] = [];
        for (let i = 0; i < points.length; i++) {  
            let connector = new google.maps.LatLng(points[i].lat, points[i].lng);
            distances.push({shapeid: points[i].shapeid,
                            name: points[i].name,
                            lat: points[i].lat,
                            lng: points[i].lng,
                            // calculate distance between starting point and connection points of startRoutingPolygon
                            distance: this.computeDistance(connector, point)});            
        }
        // sort distances
        return distances.sort(function(a,b) {return (a.distance > b.distance) ? 1 : ((b.distance > a.distance) ? -1 : 0);} ); 
    }

    /**
     * See if two line segments intersect
     * @author Peter Kelley
     * @author pgkelley4@gmail.com
     * https://github.com/pgkelley4/line-segments-intersect/blob/master/js/line-segments-intersect.js
     * http://stackoverflow.com/a/565282/786339
     * @param p1x 
     * @param p1y 
     * @param p2x 
     * @param p2y 
     * @param p3x 
     * @param p3y 
     * @param p4x 
     * @param p4y 
     */
    public getLineIntersection(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) {
        if (this.equalPoints(p1x, p1y, p3x, p3y) || this.equalPoints(p1x, p1y, p4x, p4y) || this.equalPoints(p2x, p2y, p3x, p3y) || this.equalPoints(p2x, p2y, p4x, p4y)) {
            return false;
        } 

        let s1x, s1y, s2x, s2y;
        s1x = p2x - p1x;
        s1y = p2y - p1y;
        s2x = p4x - p3x;
        s2y = p4y - p3y;

        let s, t;
        s = (-s1y * (p1x - p3x) + s1x * (p1y - p3y)) / (-s2x * s1y + s1x * s2y);
        t = ( s2x * (p1y - p3y) - s2y * (p1x - p3x)) / (-s2x * s1y + s1x * s2y);

        if (s >= 0 && s <= 1 && t >= 0 && t <= 1) return true;
        return false; // No collision
    }
    public equalPoints(p1x, p1y, p2x, p2y) {
        return (p1x == p2x) && (p1y == p2y);
    }
}