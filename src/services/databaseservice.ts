import { Injectable } from '@angular/core'; 
import { SQLite, SQLiteObject } from "@ionic-native/sqlite";
import { Observable } from 'rxjs/Observable';

@Injectable()
export class DatabaseService {  

    private options = { name: "data.db", location: 'default', createFromLocation: 1 };
    private query = "SELECT * FROM allrooms";
    public allrooms: any[] = [];
    public rooms: any[] = [];

    public selectedRoom: String[] = [];

    public selectedRoomName: any;
    public selectedRoomCoordinates: any;

    constructor(private sqlite: SQLite) {

    } 

    initializeDatabase() {
        let query = "SELECT * FROM allrooms";
        this.sqlite.create(this.options).then((db: SQLiteObject) => {    
            db.executeSql(query, {}).then((data) => { 
                let rows = data.rows;
                for (let i = 0; i < rows.length; i++) {
                    this.allrooms.push({name: rows.item(i).name, desc: rows.item(i).desc, table: rows.item(i).table}).toString;
                }
                console.log("Number of allrooms in database = " + this.allrooms.length);
            })
        });
    }

    getRoomList() {
        this.allrooms = [];
        let query = "SELECT * FROM allrooms";
        this.sqlite.create(this.options).then((db: SQLiteObject) => {    
            db.executeSql(query, {}).then((data) => { 
                let rows = data.rows;
                for (let i = 0; i < rows.length; i++) {
                    this.allrooms.push({name: rows.item(i).name, desc: rows.item(i).desc, table: rows.item(i).table}).toString;
                }
                console.log("Number of allrooms in database = " + this.allrooms.length);
            })
        });
        return Promise.resolve(this.allrooms);
    }

    getRooms(table: String) {
        console.log("GETROOMS");
        let query = "SELECT * FROM " + table;
        return Observable.create(observer => {
            this.sqlite.create(this.options).then((db: SQLiteObject) => {    
                db.executeSql(query, {}).then((data) => { 
                    for (let i = 0; i < data.rows.length; i++) {
                        let rows = data.rows;
                        this.rooms.push({name: rows.item(i).name, type: rows.item(i).type, desc: rows.item(i).desc, coordinates: rows.item(i).coordinates}).toString;
                        //console.log("OBSERVER NEXT: " + i);                        
                    }
                    observer.next(this.rooms);
                    console.log("Number of rooms in " + table + " = " + data.rows.length);
                    observer.complete();                    
                })
            }); 
        })
    }

    getRoomsPromise(table): any {
        console.log("GETROOMS");
        this.rooms = [];
        let query = "SELECT * FROM " + table;
        this.sqlite.create(this.options).then((db: SQLiteObject) => {    
            db.executeSql(query, {}).then((data) => { 
                for (let i = 0; i < data.rows.length; i++) {
                    let rows = data.rows;
                    this.rooms.push({name: rows.item(i).name, type: rows.item(i).type, desc: rows.item(i).desc, coordinates: rows.item(i).coordinates}).toString;
                    console.log("Promise: " + this.rooms[i].coordinates);
                    //console.log("OBSERVER NEXT: " + i);                        
                }                
            })
            return this.rooms;
        }); 
        
    }

    getRoomsPromise2(table) {
        return this.getRoomsPromise(table).then((data) => {
            return data;
        })
    }

    getAllRooms() {
        return this.allrooms;
    }

    getRoom(roomName: any, roomTable: any) {
        console.log("# DB SERVICE GET ROOM #  " + roomName);
        let queryRoom = "SELECT * FROM " + roomTable + " WHERE name LIKE '%" + roomName + "%'";
        let selectedRoom: String[] = [];

        return Observable.create(observer => {
            this.sqlite.create(this.options).then((db: SQLiteObject) => {  
                db.executeSql(queryRoom, {}).then((data) => {  
                    //this.selectedRoom.push(data.rows.item(0).name, data.rows.item(0).coordinates);
                    observer.next(data.rows.item(0));
                    console.log("OBSERVER: " + data.rows.item(0).name);
                    observer.complete();     
                })   
                        
            });
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