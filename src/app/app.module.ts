import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';
import { ListPage } from '../pages/list/list';
import { HotSpotPage } from '../pages/hotspot/hotspot';
import { BeaconPage } from '../pages/beacon/beacon';

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Geolocation } from '@ionic-native/geolocation';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite';
import { IBeacon } from '@ionic-native/ibeacon';
import { Keyboard } from '@ionic-native/keyboard';

import { BeaconService } from '../services/beaconservice';
import { DatabaseService } from '../services/databaseservice';
import { KalmanService } from '../services/kalmanservice';
import { MapService } from '../services/mapservice';
import { WifiService } from '../services/wifiservice';

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    ListPage,
    HotSpotPage,
    BeaconPage
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    IonicModule.forRoot(MyApp, {
      scrollAssist: false,
      autoFocusAssist: false
    }),
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    ListPage,
    HotSpotPage,
    BeaconPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    Geolocation,
    IBeacon,
    Keyboard,
    SQLite,        
    BeaconService,
    DatabaseService,
    KalmanService,
    MapService,
    WifiService,
    {provide: ErrorHandler, useClass: IonicErrorHandler}
  ]
})
export class AppModule {}
