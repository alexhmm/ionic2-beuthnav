import { Injectable } from '@angular/core'; 
import { SQLite, SQLiteObject } from "@ionic-native/sqlite";
import { Observable } from 'rxjs/Observable';

enum BuildingLevels {
    BeuthA = <any>[0, 1],
    BauwesenD = <any>[0, 1]    
}

@Injectable()
export class DatabaseService {  

    private options = { name: "beuth.db", location: 'default', createFromLocation: 1 };
    public tables: any[] = [];
    private query = "SELECT * FROM allrooms";
    public buildings: any[] = [];
    public allrooms: any[] = [];
    public rooms: any[] = [];

    public selectedRoom: String[] = [];

    public selectedRoomName: any;
    public selectedRoomCoordinates: any;

    public database;

    constructor(private sqlite: SQLite) {
        this.buildings = [{shapeid: 0, name: "BeuthA", lat: 52.545189, lng: 13.351602},
                          {shapeid: 1, name: "GaußB", lat: 52.543267, lng: 13.350684},
                          {shapeid: 2, name: "GrashofC", lat: 52.544383, lng: 13.352583},   
                          {shapeid: 3, name : "BauwesenD", lat: 52.545246, lng: 13.355341}];                          
        this.tables = [{building: "BauwesenD", level: 0, attr: "d00Attr", coords: "d00Coords", points: "d00Points"},
                       {building: "BauwesenD", level: 1, attr: "d01Attr", coords: "d01Coords", points: "d01Points"}];
        this.database = new SQLite();
            this.database.create(this.options).then(() => {
                console.log("Database opened.");
            }, (error) => {
                console.log("ERROR: ", error);
        });
    }
    
    public getBuildingsCentroids() {
        return this.buildings;
    }

    public getBuildingLevels(building: any) {
        return BuildingLevels[building];
    }

    /**
     * 
     * @param building 
     * @param level 
     */
    public getTablesByBuildingLevel(building: any, level: any) {
        this.allrooms = [];
        return Observable.create(observer => {
            let query = "SELECT * FROM layers WHERE building LIKE '%" + building + "%' AND level LIKE '%" + level + "%'";
            this.sqlite.create(this.options).then((db: SQLiteObject) => {  
                db.executeSql(query, {}).then((data) => {  
                    observer.next({attr: data.rows.item(0).attr, coords: data.rows.item(0).coords, points: data.rows.item(0).points});
                    console.log("Selected tables: " + data.rows.item(0).attr + ", " + data.rows.item(0).coords + ", " + data.rows.item(0).points);
                    observer.complete();     
                })                           
            }); 
        })
    }

    /**
     * Returns room attributes by shapeid
     * @param tableAttr 
     * @param shapeid 
     */
    public getRoutingPolygons(tableAttr: String) {
        let queryAttr = "SELECT * FROM " + tableAttr + " WHERE routing LIKE '%true%'";
        return Observable.create(observer => {
            this.sqlite.create(this.options).then((db: SQLiteObject) => {  
                db.executeSql(queryAttr, {}).then((data) => {  
                    let rows = data.rows;
                    let routingPolygons: any[] = [];
                    for (let i = 0; i < rows.length; i++) {
                        routingPolygons.push({shapeid: rows.item(i).shapeid, name: rows.item(i).name}).toString;
                    }                    
                    observer.next(routingPolygons);
                    console.log("OBSERVER: " + data.rows.item(0).name);
                    observer.complete();     
                })                           
            });
        })
    }

    /**
     * Returns room attributes for ListView
    */
    public getRoomList() {
        this.allrooms = [];
        return Observable.create(observer => {
            for (let x in this.tables) {
                let query = "SELECT * FROM " + this.tables[x].attr;
                this.sqlite.create(this.options).then((db: SQLiteObject) => {    
                    db.executeSql(query, {}).then((data) => { 
                        let rows = data.rows;
                        for (let i = 0; i < rows.length; i++) {
                            //if (rows.item(i).type == "lab" || "lecture" || "office" || "service" || "wc") {
                            if (rows.item(i).type == "lab" || "lecture" || "office" || "service") {
                                this.allrooms.push({shapeid: rows.item(i).shapeid,
                                                    name: rows.item(i).name,
                                                    desc: rows.item(i).desc,
                                                    building: this.tables[x].building,
                                                    level: this.tables[x].level}).toString;
                                //console.log("this.allrooms: " + rows.item(i).name + ", " + this.tables[x].attr);
                            }
                        }
                    })
                });
            }            
            observer.next(this.allrooms);
            console.log("Number of loaded rooms in viewList: " + this.allrooms.length);
            observer.complete();
        })
    }

    /**
     * Returns room attributes by shapeid
     * @param tableAttr 
     * @param shapeid 
     */
    public getAttributesByShapeId(tableAttr: String, shapeid: String) {
        let queryAttr = "SELECT * FROM " + tableAttr + " WHERE shapeid LIKE '%" + shapeid + "%'";
        return Observable.create(observer => {
            this.sqlite.create(this.options).then((db: SQLiteObject) => {  
                db.executeSql(queryAttr, {}).then((data) => {  
                    observer.next(data.rows.item(0));
                    console.log("OBSERVER: " + data.rows.item(0).name);
                    observer.complete();     
                })                           
            });
        })
    }

    public getCoordinatesByShapeId(tableCoords: String, shapeid: String) {
        let coordinates: any[] = [];
        let queryAttr = "SELECT * FROM " + tableCoords + " WHERE shapeid LIKE '%" + shapeid + "%'";
        return Observable.create(observer => {
            this.sqlite.create(this.options).then((db: SQLiteObject) => {  
                db.executeSql(queryAttr, {}).then((data) => {  
                    for (let i = 0; i < data.rows.length -1; i++) {
                        coordinates.push({lat: data.rows.item(i).y, lng: data.rows.item(i).x});                      
                        //console.log("OBSERVER: " + data.rows.item(i).y);
                    }
                    observer.next(coordinates);
                    observer.complete();     
                })                           
            });
        })
    }

     /**
     * Returns
     * @param tableAttr 
     * @param point 
     */
    public getTablePointsByTableAttr(tableAttr: any) {
        let queryAttr = "SELECT * FROM layers WHERE attr LIKE '%" + tableAttr + "%'";
        return Observable.create(observer => {
            this.sqlite.create(this.options).then((db: SQLiteObject) => {  
                db.executeSql(queryAttr, {}).then((data) => {  
                    observer.next(data.rows.item(0));
                    console.log("OBSERVER POINTS: " + data.rows.item(0).points);
                    observer.complete();     
                })                           
            });
        })
    }

    /**
     * Returns point coordinates from room
     * @param tablePoints
     * @param name 
     */
    public getCoordsByPoint(tablePoints: any, name: any) {
        let queryAttr = "SELECT * FROM " + tablePoints + " WHERE name LIKE '%" + name + "%'";
        return Observable.create(observer => {
            this.sqlite.create(this.options).then((db: SQLiteObject) => {  
                db.executeSql(queryAttr, {}).then((data) => {  
                    observer.next(data.rows.item(0));
                    console.log("OBSERVER POINTSCOORDS: " + data.rows.item(0).x + ", " + data.rows.item(0).y);
                    observer.complete();     
                })                           
            });
        })
    }

    /**
     * Returns all building
     * @param table 
     * @param exclude 
     */
    getAllBuildingsAttrCoords(skip: String) {
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
     * Returns all rooms with attributes of a floor
     * @param tableAttributes 
     * @param tableCoordinates 
     */
    getAllRoomsAttrCoords(tableAttr: String, tableCoords: String) {
        this.rooms = [];
        console.log("Select room attributes.");
        let queryAttr = "SELECT * FROM " + tableAttr;
        let queryCoords = "SELECT * FROM " + tableCoords;
        let queryPoints = "SELECT points FROM layers WHERE attr LIKE '%" + tableAttr + "%'";
        return Observable.create(observer => {
            this.sqlite.create(this.options).then((db: SQLiteObject) => {
                db.executeSql(queryAttr, []).then((data) => {
                    for (let i = 0; i < data.rows.length; i++) {
                        let rows = data.rows;
                        this.rooms.push({shapeid: rows.item(i).shapeid,
                                         name: rows.item(i).name,
                                         type: rows.item(i).type,
                                         desc: rows.item(i).desc,
                                         routing: rows.item(i).routing,
                                         coordinates: "".toString});
                    }                    
                })
                db.executeSql(queryCoords, []).then((data) => {   
                    for (let i = 0; i < this.rooms.length; i++) {
                        let coordinateArray = [];
                        let coordinatesStr = "";
                        //let index = this.rooms.map(function(e) { return e.shapeid; }).indexOf(this.rooms[i].shapeid);
                        for (let j = 0; j < data.rows.length; j++) {
                            let rows = data.rows;
                            if (rows.item(j).shapeid === this.rooms[i].shapeid) {
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
                        this.rooms[i].coordinates = coordinatesStr;         
                        //console.log("NEW: " + this.rooms[i].name + " || " + this.rooms[i].coordinates);                                                
                    }                        
                })   
                db.executeSql(queryPoints, []).then((data) => { 
                    let tablePoints = data.rows.item(0).points;                    
                    for (let i = 0; i < this.rooms.length; i++) this.rooms[i].points = tablePoints;
                    observer.next(this.rooms);                
                    observer.complete();
                });             
            })
        })
    }

    /**
     * Returns all routing points of current building level
     * @param tablePoints 
     */
    public getAllPoints(tablePoints: any) {
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

    public selectRoom(shapeid: any, name: any, building: any, level: any) {
        let tableAttr, tableCoords;
        for (let x in this.tables) {
            if (building == this.tables[x].building && level == this.tables[x].level) {
                tableAttr = this.tables[x].attr;
                tableCoords = this.tables[x].coords;
            }
        }
        console.log("# DB SERVICE GET ROOM #  " + name + ", " + tableAttr + ", " + tableCoords);
        let queryCoords = "SELECT * FROM " + tableCoords + " WHERE shapeid LIKE '%" + shapeid + "%'";
       
        let selectedRoom: String[] = [];

        return Observable.create(observer => {     
            this.sqlite.create(this.options).then((db: SQLiteObject) => {
                db.executeSql(queryCoords, []).then((data) => {  
                    let coordinates: any[] = []; 
                    for (let i = 0; i < data.length; i++) {
                        coordinates.push({lat: data.rows(i).y, lng: data.rows(i).x});
                        //console.log("NEW: " + this.rooms[i].name + " || " + this.rooms[i].coordinates);                                                
                    } 
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
        let selectedRoom: String[] = [];
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

    public getSelectedRoom() {
        return this.selectedRoom;
    } 

    public getSelectedRoomName() {
        return this.selectedRoomName;
    }

    public setSelectedRoomName(name: String) {
        this.selectedRoomName = name;
        console.log("SET ROOMNAME: " + this.selectedRoomName)
    }

    public getSelectedRoomCoordinates() {
        //return this.selectedRoomCoordinates;
        return "";
    }

    public setSelectedRoomCoordinates(coordinates: String) {
        this.selectedRoomCoordinates = coordinates;
        console.log("SET ROOMCOORDINATES: " + this.selectedRoomCoordinates)
    }
}