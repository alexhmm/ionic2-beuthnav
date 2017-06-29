import { Injectable } from '@angular/core'; 
import { SQLite, SQLiteObject } from "@ionic-native/sqlite";
import { Observable } from 'rxjs/Observable';

@Injectable()
export class DatabaseService {  

    private options = { name: "beuth.db", location: 'default', createFromLocation: 1 };
    public tables: any[] = [];
    private query = "SELECT * FROM allrooms";
    public allrooms: any[] = [];
    public rooms: any[] = [];

    public selectedRoom: String[] = [];

    public selectedRoomName: any;
    public selectedRoomCoordinates: any;

    public database;

    constructor(private sqlite: SQLite) {
        this.tables = [{building: "Bauwesen", level: 0, attr: "d00Attr", coords: "d00Coords"},
                       {building: "Bauwesen", level: 1, attr: "d01Attr", coords: "d01Coords"}];

        this.database = new SQLite();
            this.database.create(this.options).then(() => {
                console.log("Database opened.");
            }, (error) => {
                console.log("ERROR: ", error);
        });
    } 

    /**
     * 
     * @param building 
     * @param level 
     */
    getAttrCoordsTables(building: any, level: any) {
        this.allrooms = [];
        return Observable.create(observer => {
            let query = "SELECT * FROM layers WHERE building LIKE '%" + building + "%' AND level LIKE '%" + level + "%'";
            this.sqlite.create(this.options).then((db: SQLiteObject) => {  
                db.executeSql(query, {}).then((data) => {  
                    observer.next({attr: data.rows.item(0).attr, coords: data.rows.item(0).coords});
                    console.log("CURRENT TABLES: " + data.rows.item(0).attr + ", " + data.rows.item(0).coords);
                    observer.complete();     
                })                           
            }); 
        })
    }

    /**
     * Returns room attributes for ListView
    */
    getRoomList() {
        this.allrooms = [];
        return Observable.create(observer => {
            for (let x in this.tables) {
                let query = "SELECT * FROM " + this.tables[x].attr;
                this.sqlite.create(this.options).then((db: SQLiteObject) => {    
                    db.executeSql(query, {}).then((data) => { 
                        let rows = data.rows;
                        for (let i = 0; i < rows.length; i++) {
                            if (rows.item(i).type == "lab" || "lecture" || "office" || "service" || "wc") {
                                this.allrooms.push({shapeid: rows.item(i).shapeid, name: rows.item(i).name, desc: rows.item(i).desc, table: this.tables[x].attr}).toString;
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
    getAttributesByShapeId(tableAttr: String, shapeid: String) {
        let rooms = [];
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

    /**
     * Returns all rooms with attributes of a floor
     * @param tableAttributes 
     * @param tableCoordinates 
     */
    getAllRoomsAttrCoords(tableAttr: String, tableCoords: String) {
        this.rooms = [];
        console.log("SELECT ROOMS ATTRIBUTES");
        let queryAttr = "SELECT * FROM " + tableAttr;
        let queryCoords = "SELECT * FROM " + tableCoords;
        return Observable.create(observer => {
            this.sqlite.create(this.options).then((db: SQLiteObject) => {
                db.executeSql(queryAttr, []).then((data) => {
                    for (let i = 0; i < data.rows.length; i++) {
                        let rows = data.rows;
                        this.rooms.push({shapeid: rows.item(i).shapeid, name: rows.item(i).name, type: rows.item(i).type, desc: rows.item(i).desc, coordinates: ""}).toString;
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
                    observer.next(this.rooms);                
                    observer.complete();
                })                
            })
        })
    }

    selectRoom(name: any, table: any, shapeid: any) {
        let tableCoords;
        for (let x in this.tables) {
            if (table == this.tables[x].attr) {
                tableCoords = this.tables[x].coords;
            }
        }
        console.log("# DB SERVICE GET ROOM #  " + name + ", " + table + ", " + tableCoords);
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

    getSelectedRoom() {
        return this.selectedRoom;
    } 

    getSelectedRoomName() {
        return this.selectedRoomName;
    }

    public setSelectedRoomName(name: String) {
        this.selectedRoomName = name;
        console.log("SET ROOMNAME: " + this.selectedRoomName)
    }

    getSelectedRoomCoordinates() {
        //return this.selectedRoomCoordinates;
        return "";
    }

    public setSelectedRoomCoordinates(coordinates: String) {
        this.selectedRoomCoordinates = coordinates;
        console.log("SET ROOMCOORDINATES: " + this.selectedRoomCoordinates)
    }
}