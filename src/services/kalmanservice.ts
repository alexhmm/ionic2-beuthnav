import { Injectable } from '@angular/core'; 

/**
* KalmanFilter
* @class
* @author Wouter Bulten
* @see {@link http://github.com/wouterbulten/kalmanjs}
* @version Version: 1.0.0-beta
* @copyright Copyright 2015 Wouter Bulten
* @license GNU LESSER GENERAL PUBLIC LICENSE v3
* @preserve
*/
@Injectable()
export class KalmanService {

    public R; // process noise
    public Q; // measurement noise
    public A; // state vector
    public B; // control vector
    public C; // measurement vector
    public cov;
    public x;

    constructor() {

    }

    /**
     * Filter a new value
     */
    public filter(z: any, r: number, q: number, a: number, b: number, c: number, u = 0) {

        this.R = r;
        this.Q = q;
        this.A = a;
        this.B = b;
        this.C = c;

        if (isNaN(this.x)) {
            //console.log("isNaN");
            this.x = (1 / this.C) * z;
            this.cov = (1 / this.C) * this.Q * (1 / this.C);
        } else {
            //console.log("Compute Prediction");
            // Compute prediction
            const predX = (this.A * this.x) + (this.B * u);
            const predCov = ((this.A * this.cov) * this.A) + this.R;

            // Kalman gain
            const K = predCov * this.C * (1 / ((this.C * predCov * this.C) + this.Q));

            // Correction
            this.x = predX + K * (z - (this.C * predX));
            this.cov = predCov - (K * this.C * predCov);
        }
        //console.log("THIS X: " + this.x)
        return this.x;
    }

    /**
    * Return the last filtered measurement
    * @return {Number}
    */
    public lastMeasurement() {
       return this.x;
    }

    /**
    * Set measurement noise Q
    * @param {Number} noise
    */
    public setMeasurementNoise(noise: any) {
        this.Q = noise;
    }

    /**
    * Set the process noise R
    * @param {Number} noise
    */
    public setProcessNoise(noise: any) {
        this.R = noise;
    }
}