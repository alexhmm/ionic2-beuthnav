import { Injectable } from '@angular/core'; 
import { File } from '@ionic-native/file';

@Injectable()
export class FileService {
    constructor(public file: File) {

    }

    public createFile() {
        let date = new Date();
        let time = date.getHours() + "-" + date.getMinutes() + "-" + date.getSeconds();
        let name = "xx" + time;
        this.file.createFile(this.file.cacheDirectory, name, true).then(data => console.log('Created Cache file.')).catch(err => console.log(err));
        let text = 'Beacons-Test \n Zeile 2 \n' + time;
        this.file.writeExistingFile(this.file.cacheDirectory, name, text).then(data => console.log('Text wrote.')).catch(err => console.log(err));
    }

    public readFile(event, file) {
        console.log("File read: " + file.name);
        this.file.readAsText(this.file.cacheDirectory, file.name).then(data => console.log(data)).catch(err => console.log('File not read:' + err));
    }

    public deleteFile(event, file) {
         console.log("File deleted: " + file.name);
        this.file.removeFile(this.file.cacheDirectory, file.name).then(data => console.log('File deleted.')).catch(err => console.log('File not deleted: ' + err));
    }
}