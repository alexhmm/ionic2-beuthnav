import { Injectable } from '@angular/core'; 

@Injectable()
export class Room { 

    public name: String;
    public coordinates: String;

    constructor(name, coordinates) {
        this.name = name;
        this.coordinates = coordinates;
    } 

    
  }
