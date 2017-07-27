/**
 * @author Peter Kelley
 * @author pgkelley4@gmail.com
 */

/**
 * See if two line segments intersect. This uses the 
 * vector cross product approach described below:
 * http://stackoverflow.com/a/565282/786339
 * 
 * @param {Object} p1 point object with x and y coordinates
 *  representing the start of the 1st line.
 * @param {Object} p2 point object with x and y coordinates
 *  representing the end of the 1st line.
 * @param {Object} q1 point object with x and y coordinates
 *  representing the start of the 2nd line.
 * @param {Object} q2 point object with x and y coordinates
 *  representing the end of the 2nd line.
 */

import { Injectable } from '@angular/core'; 

@Injectable()
export class IntersectService {

    public doLineSegmentsIntersect(p1, p2, q1, q2) {
        var r = this.subtractPoints(p2, p1);
        var s = this.subtractPoints(q2, q1);

        var uNumerator = this.crossProduct(this.subtractPoints(q1, p1), r);
        var denominator = this.crossProduct(r, s);

        if (uNumerator == 0 && denominator == 0) {
            // They are coLlinear
            
            // Do they touch? (Are any of the points equal?)
            if (this.equalPoints(p1, q1) || this.equalPoints(p1, q2) || this.equalPoints(p2, q1) || this.equalPoints(p2, q2)) {
                return true
            }
            // Do they overlap? (Are all the point differences in either direction the same sign)
            return !this.allEqual([
                    (q1.x - p1.x < 0),
                    (q1.x - p2.x < 0),
                    (q2.x - p1.x < 0),
                    (q2.x - p2.x < 0)]) ||
                !this.allEqual([
                    (q1.y - p1.y < 0),
                    (q1.y - p2.y < 0),
                    (q2.y - p1.y < 0),
                    (q2.y - p2.y < 0)]);
        }

        if (denominator == 0) {
            // lines are paralell
            return false;
        }

        var u = uNumerator / denominator;
        var t = this.crossProduct(this.subtractPoints(q1, p1), s) / denominator;

        return (t >= 0) && (t <= 1) && (u >= 0) && (u <= 1);
    }

    /**
     * Calculate the cross product of the two points.
     * 
     * @param {Object} point1 point object with x and y coordinates
     * @param {Object} point2 point object with x and y coordinates
     * 
     * @return the cross product result as a float
     */
    public crossProduct(point1, point2) {
        return point1.x * point2.y - point1.y * point2.x;
    }

    /**
     * Subtract the second point from the first.
     * 
     * @param {Object} point1 point object with x and y coordinates
     * @param {Object} point2 point object with x and y coordinates
     * 
     * @return the subtraction result as a point object
     */ 
    public subtractPoints(point1, point2) {
        var result = {x: 0, y: 0};
        result.x = point1.x - point2.x;
        result.y = point1.y - point2.y;

        return result;
    }

    /**
     * See if the points are equal.
     *
     * @param {Object} point1 point object with x and y coordinates
     * @param {Object} point2 point object with x and y coordinates
     *
     * @return if the points are equal
     */
    public equalPoints(point1, point2) {
        return (point1.x == point2.x) && (point1.y == point2.y)
    }

    /**
     * See if all arguments are equal.
     *
     * @param {...} args arguments that will be compared by '=='.
     *
     * @return if all arguments are equal
     */
    public allEqual(points) {
        var firstValue = points[0],
            i;
        for (i = 1; i < points.length; i += 1) {
            if (points[i] != firstValue) {
                return false;
            }
        }
        return true;
    }
}

