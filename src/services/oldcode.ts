// Home ts. JSON Code loadMap()
        /*for (let x in allrooms) {
            let type = allrooms[x].type;
            let JSONcoordinates = allrooms[x].coordinates;
            //console.log("TYPE: " + type + "COOR; " + JSONcoordinates);
            let coordinates: String[] = JSONcoordinates.split("; ");

            // split all coordinates to LatLng paths
            let paths: any[] = this.mapservice.splitCoordinatesToLatLng(coordinates);

            let polygon = new google.maps.Polygon();
            polygon.setOptions(this.mapservice.createRoomPolygonOptions(paths, type));
            polygon.setMap(this.map);   

            let centroid = this.mapservice.getPolygonCentroid(paths);

            google.maps.event.addListener(polygon, 'click', () => {
                this.addMarker(centroid, allrooms[x].desc);
            });
        }*/

// Home.ts JSON Code selectRoom()
        /*try {
            let index = this.allrooms.map(function(e) { return e.name; }).indexOf(room.name);
            let selectedRoom = this.allrooms[index];
            console.log("Selected room index: " + selectedRoom.name);

            let mapRoomAllCoordinates: any[] = [];
            let mapRoomCoordinates: any[] = selectedRoom.coordinates.split("; ");

            mapRoomAllCoordinates = this.mapservice.splitCoordinatesToLatLng(mapRoomCoordinates);

            let mapRoomCentroid: any = {lat: 0, lng: 0};
            mapRoomCentroid = this.mapservice.getPolygonCentroid(mapRoomAllCoordinates);

            if (this.listViewState == 'in') {
                this.toggleListView();
            }

            this.addMarker(mapRoomCentroid, selectedRoom.desc);

        } catch (e) {
            console.log ("Index error: " + e);
        }*/