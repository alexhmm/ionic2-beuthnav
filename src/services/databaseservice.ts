import { Injectable } from '@angular/core'; 
import { SQLite, SQLiteObject } from "@ionic-native/sqlite";
import { Observable } from 'rxjs/Observable';

enum BuildingLevels {
    BeuthA = <any>[0, 1],
    GaussB = <any>[0, 1],
    GrashofC = <any>[0, 0],
    BauwesenD = <any>[0, 1]    
}

@Injectable()
export class DatabaseService {  

    private options = { name: "beuth.db", location: 'default', createFromLocation: 1 };    
    public database;

    public tables: any[] = [];
    public buildings: any[] = [];

    constructor(private sqlite: SQLite) {
        this.buildings = [{shapeid: 0, name: "BeuthA", lat: 52.545189, lng: 13.351602},
                          {shapeid: 1, name: "GaussB", lat: 52.543267, lng: 13.350684},
                          {shapeid: 2, name: "GrashofC", lat: 52.544383, lng: 13.352583},   
                          {shapeid: 3, name : "BauwesenD", lat: 52.545246, lng: 13.355341}];                          
        this.tables = [{building: "BeuthA", level: 0, attr: "a00Attr", coords: "a00Coords", points: "a00Points"},
                       {building: "BeuthA", level: 1, attr: "a01Attr", coords: "a01Coords", points: "a01Points"},
                       {building: "GaussB", level: 0, attr: "b00Attr", coords: "b00Coords", points: "b00Points"},
                       {building: "GaussB", level: 1, attr: "b01Attr", coords: "b01Coords", points: "b01Points"},
                       {building: "GrashofC", level: 0, attr: "c00Attr", coords: "c00Coords", points: "c00Points"},
                       {building: "BauwesenD", level: 0, attr: "d00Attr", coords: "d00Coords", points: "d00Points"},
                       {building: "BauwesenD", level: 1, attr: "d01Attr", coords: "d01Coords", points: "d01Points"}];
        this.database = new SQLite();
            this.database.create(this.options).then(() => {
                console.log("Database opened.");
            }, (error) => {
                console.log("DATABASE ERROR: ", error);
        });
    }
    
    public getBuildingsCentroids() {
        return this.buildings;
    }

    public getBuildingLevels(building: any) {
        return BuildingLevels[building];
    }

    /**
     * Returns room attributes for search listview
    */
    public getRoomsListView() {
        let roomsListView: any[] = [];
        return Observable.create(observer => {
            for (let x in this.tables) {
                let query = "SELECT * FROM " + this.tables[x].attr;
                this.sqlite.create(this.options).then((db: SQLiteObject) => {    
                    db.executeSql(query, {}).then((data) => { 
                        let rows = data.rows;
                        for (let i = 0; i < rows.length; i++) {
                            if (rows.item(i).type == "lab" || "lecture" || "office" || "cafe" || "mensa" || "lib") {
                                roomsListView.push({shapeid: rows.item(i).shapeid,
                                                    name: rows.item(i).name,
                                                    desc: rows.item(i).desc,
                                                    building: this.tables[x].building,
                                                    level: this.tables[x].level}).toString;
                            }
                        }   
                        roomsListView.sort((a, b) => {
                            if (a.name < b.name) return -1;
                            if (a.name > b.name) return 1;
                            return 0;
                        })                     
                    })
                });
            }            
            observer.next(roomsListView);
            observer.complete(); 
        })
    }

    public getCurrentBuildingTables(building: any, level: any) {
        for (let x in this.tables) {
            if (building == this.tables[x].building && level == this.tables[x].level) {
                console.log("getCurrentBuildingTables: " + this.tables[x].attr);
                return {attr: this.tables[x].attr, coords: this.tables[x].coords, points: this.tables[x].points}
            }
        }
        return {attr: "d00Attr", coords: "d00Coords", points: "d00Points"};
    }

    public getLevelTables(building: any, level: any) {
        let tableAttr, tableCoords, tablePoints;
        for (let x in this.tables) {
            if (building == this.tables[x].building && level == this.tables[x].level) {
                tableAttr = this.tables[x].attr;
                tableCoords = this.tables[x].coords;
                tablePoints = this.tables[x].points;
                return [tableAttr, tableCoords, tablePoints];
            }
        }
    }

    public getRoutingPolygonsAttr(data: any) {
        let routingPolygons: any[] = [];
        let rows = data.rows;                            
        for (let i = 0; i < rows.length; i++) {
            routingPolygons.push({shapeid: rows.item(i).shapeid,
                                  name: rows.item(i).name,
                                  coordinates: "".toString});
        }      
        return routingPolygons;
    }

    public getRoutingPolygonsCoords(data: any, routingPolygons: any) {
        for (let i = 0; i < routingPolygons.length; i++) {
            let coordinates = [];
            let coordinatesStr = "";
            for (let j = 0; j < data.rows.length; j++) {
                let rows = data.rows;
                if (rows.item(j).shapeid === routingPolygons[i].shapeid) {
                    coordinates.push(rows.item(j).y + ", " + rows.item(j).x + "; ");
                }
            }
            // splice end coordinate (duplicate from start coordinate)
            coordinates.splice(coordinates.length - 1, 1);
            for (let x in coordinates) {
                coordinatesStr += coordinates[x];
            }
            coordinatesStr = coordinatesStr.substring(0, coordinatesStr.length - 2);
            routingPolygons[i].coordinates = coordinatesStr;        
        }
        return routingPolygons;
    }

    /**
     * Returns routing polygons and points from specific building level
     * @param building 
     * @param level 
     * @param rPointType 
     * @param rPointEndName 
     */
    public getRoutingPolygonsPoints(building: String, level: number) {   
        let routingPolygons: any[] = [];
        let routingPoints: any[] = [];

        let tables = this.getLevelTables(building, level);        
        let queryAttr = "SELECT * FROM " + tables[0] + " WHERE routing LIKE '%true%'";
        let queryCoords = "SELECT * FROM " + tables[1];
        let queryPoints = "SELECT * FROM " + tables[2];

        return Observable.create(observer => {
            this.sqlite.create(this.options).then((db: SQLiteObject) => {  
                db.executeSql(queryAttr, {}).then((data) => {  
                    console.log("Get routing polygons attributes.");
                    routingPolygons = this.getRoutingPolygonsAttr(data);                    
                })          
                db.executeSql(queryCoords, []).then((data) => {   
                    console.log("Get routing polygons coordinates.");
                    routingPolygons = this.getRoutingPolygonsCoords(data, routingPolygons);                    
                }) 
                db.executeSql(queryPoints, []).then((data) => {
                    console.log("Get routing points.");
                    routingPoints = this.getRoutingPoints(data);
                    observer.next([routingPolygons, routingPoints]);
                    observer.complete();   
                })                    
            });                  
        })
    }   

    
    /**
     * Returns routing points from specific building level
     * @param data 
     */
    public getRoutingPoints(data: any) {
        let routingPoints: any[] = [];
        for (let i = 0; i < data.rows.length; i++) {
            let rows = data.rows;
            routingPoints.push({lat: parseFloat(rows.item(i).y),
                                lng: parseFloat(rows.item(i).x),
                                type: rows.item(i).type,
                                name: rows.item(i).name,
                                routing: rows.item(i).routing});
        }  
        return routingPoints;                 
    }

    /**
     * Returns building coordinates for skipped indoor mapping
     * @param table 
     * @param exclude 
     */
    public getAllBuildingsAttrCoords(skip: String) {
        let buildingsSkip: any[] = [];
        let query = "SELECT * FROM buildings WHERE name NOT LIKE '%" + skip + "%'";
        return Observable.create(observer => {
            this.sqlite.create(this.options).then((db: SQLiteObject) => {
                db.executeSql(query, []).then((data) => {
                    for (let i = 0; i < data.rows.length; i++) {
                        let rows = data.rows;
                        buildingsSkip.push({name: rows.item(i).name, coordinates: rows.item(i).coordinates})
                    }
                    observer.next(buildingsSkip);
                    observer.complete();
                })                
            })
        })
    }

    /**
     * Returns all rooms and attributes of a level
     * @param tableAttributes 
     * @param tableCoordinates 
     */
    public getCurrentAttrCoords(tableAttr: String, tableCoords: String) {
        let rooms: any[] = [];
        console.log("Select room attributes.");
        let queryAttr = "SELECT * FROM " + tableAttr;
        let queryCoords = "SELECT * FROM " + tableCoords;
        let points;

        for (let x in this.tables) {
            if (tableAttr == this.tables[x].attr) {
                points = this.tables[x].points;
                break;
            }
        }        

        return Observable.create(observer => {
            this.sqlite.create(this.options).then((db: SQLiteObject) => {
                db.executeSql(queryAttr, []).then((data) => {
                    for (let i = 0; i < data.rows.length; i++) {
                        let rows = data.rows;
                        rooms.push({shapeid: rows.item(i).shapeid,
                                         name: rows.item(i).name,
                                         type: rows.item(i).type,
                                         desc: rows.item(i).desc,
                                         routing: rows.item(i).routing,
                                         coordinates: "".toString});
                    }                    
                })
                db.executeSql(queryCoords, []).then((data) => {   
                    for (let i = 0; i < rooms.length; i++) {
                        let coordinateArray = [];
                        let coordinatesStr = "";
                        //let index = rooms.map(function(e) { return e.shapeid; }).indexOf(rooms[i].shapeid);
                        for (let j = 0; j < data.rows.length; j++) {
                            let rows = data.rows;
                            if (rows.item(j).shapeid === rooms[i].shapeid) {
                                coordinateArray.push(rows.item(j).y + ", " + rows.item(j).x + "; ");
                                //coordinatesStr += rows.item(j).y + ", " + rows.item(j).x;
                            }
                        }
                        // splice end coordinate (duplicate from start coordinate)
                        coordinateArray.splice(coordinateArray.length - 1, 1);
                        for (let x in coordinateArray) {
                            coordinatesStr += coordinateArray[x];
                        }
                        coordinatesStr = coordinatesStr.substring(0, coordinatesStr.length - 2);
                        rooms[i].coordinates = coordinatesStr;    
                    }     
                    for (let i = 0; i < rooms.length; i++) rooms[i].points = points;
                    observer.next(rooms);                
                    observer.complete();    
                });             
            })
        })
    }

    /**
     * Returns all routing points of current building level
     * @param tablePoints 
     */
    public getCurrentPoints(tablePoints: any) {        
        let points: any[] = [];
        let query = "SELECT * FROM " + tablePoints;
        return Observable.create(observer => {
            this.sqlite.create(this.options).then((db: SQLiteObject) => {
                db.executeSql(query, []).then((data) => {
                    for (let i = 0; i < data.rows.length; i++) {
                        let rows = data.rows;
                        points.push({shapeid: rows.item(i).shapeid,
                                     name: rows.item(i).name,
                                     type: rows.item(i).type,
                                     lat: parseFloat(rows.item(i).y),
                                     lng: parseFloat(rows.item(i).x)});
                    }
                    observer.next(points);
                    observer.complete();
                })                
            })
        })
    }

    /**
     * Returns room coordinates from search selection
     * @param shapeid 
     * @param building 
     * @param level 
     */
    public getRoomCoordinates(shapeid: number, building: String, level: number) {
        let tableCoords;
        for (let x in this.tables) {
            if (building == this.tables[x].building && level == this.tables[x].level) {
                tableCoords = this.tables[x].coords;
                break;
            }
        }

        let queryCoords = "SELECT * FROM " + tableCoords + " WHERE shapeid = " + shapeid;      
        console.log(queryCoords);
        return Observable.create(observer => {     
            this.sqlite.create(this.options).then((db: SQLiteObject) => {
                db.executeSql(queryCoords, []).then((data) => {
                    let coordinates: any[] = []; 
                    for (let i = 0; i < data.rows.length; i++) {
                        coordinates.push({lat: parseFloat(data.rows.item(i).y), lng: parseFloat(data.rows.item(i).x)});                                      
                    } 
                    coordinates.splice(coordinates.length - 1, 1);
                    observer.next(coordinates);                
                    observer.complete();
                })
            })
        })
    }  
    
    /**
     * Returns point of destination with coordinates
     * @param tablePoints 
     * @param name 
     */
    public getRoutePointByName(tablePoints: any, name: any) {
        let queryName = "SELECT * FROM " + tablePoints + " WHERE name LIKE '%" + name + "%'";   
        return Observable.create(observer => {     
            this.sqlite.create(this.options).then((db: SQLiteObject) => {
                db.executeSql(queryName, []).then((data) => {  
                    console.log("Pointname: " + data.rows.item(0).name);
                    let point = {lat: data.rows.item(0).y, lng: data.rows.item(0).x};                     
                    observer.next(point);                
                    observer.complete();
                })
            })
        })
    }
}