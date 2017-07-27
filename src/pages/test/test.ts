import { Component } from '@angular/core';
import { NavController, NavParams, Platform } from 'ionic-angular';
import { File } from '@ionic-native/file';
import { FileService } from '../../services/fileservice';

import * as earcut from 'earcut';

@Component({
  selector: 'page-test',
  templateUrl: 'test.html'
})
export class TestPage {  

    public networks: any[] = [];
    public files: any[] = [];

    constructor(public platform: Platform, public file: File, public fileService: FileService) {

    }  

    ionViewDidLoad() {
        this.platform.ready().then(() => {
            this.createFileList();
        });
    }

    public testFile() {        
        /* this.file.createFile(this.file.cacheDirectory, 'testFile2', true).then(data => console.log('Created Cache file.')).catch(err => console.log('Cache File not created:' + err));
        let text = 'test22';
        this.file.writeExistingFile(this.file.cacheDirectory, 'testFile2', text).then(data => console.log('Text wrote.')).catch(err => console.log('Text not wrote:' + err));
        this.file.readAsText(this.file.cacheDirectory, 'testFile').then(data => console.log('Text read: ' + data)).catch(err => console.log('Text not read:' + err)); */
    }

    public createFileList() {
        this.files = [];
        this.file.listDir(this.file.cacheDirectory, '').then(data => {            
            for (let x in data) {
                //console.log(data[x]);
                this.files.push({id: x, name: data[x].name});
            }
        }).catch(err => console.log('No List:' + err));
    }

    public createFile() {
        this.fileService.createFile();
        this.createFileList();
    }

    public readFile(event, file) {
        this.fileService.readFile(event, file);
    }

    public deleteFile(event, file) {
        this.fileService.deleteFile(event, file);
        this.createFileList();
    }
}