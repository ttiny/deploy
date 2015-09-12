"use strict";



/**
 * Creates array with duplicates of the items of this array.
 * This function works recursively and will call .duplicate() for the
 * items that implement this function.
 * @def function Array.duplicate ()
 * @return Array
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */
Object.defineProperty( Array.prototype, 'duplicate', {
	value: function () {
		var ret = [].concat( this );
		for ( var i = ret.length - 1; i >= 0; --i ) {
			var r = ret[i];
			if ( r instanceof Object && r.duplicate instanceof Function ) {
				ret[i] = r.duplicate();
			}
		}
		return ret;
	},
	writable: true
} );



/**
Alias for {@see Array.concat()}, just for consistency.
@def function Array.merge ( ... )
*/
Object.defineProperty( Array.prototype, 'merge', {
	value: Array.prototype.concat,
	writable: true
} );

/**
 * Retrieves or sets the last element of the array.
 * @def var Array.last
 * @var any|undefined Returns undefined if attempting to get the last element of zero-length array.
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */
Object.defineProperty( Array.prototype, 'last', {
	get: function () {
		var i = this.length - 1;
		return i >= 0 ? this[i] : undefined;
	},
	set: function ( v ) {
		var i = this.length - 1;
		return i >= 0 ? this[i] = v : this[0] = v;
	}
} );

/**
Performs a callback on every item of the array.

@def function Array.map ( callback, thisArg )
@param MapCallback|string|int If `string` or `int` is provided, `map()` will
    atempt to find property with the same name for each of the items of the
    array and call it as callback.
@param Object Object to be used as `this` object for the callback. Not
    applicable if the callback is a string.
@return Array New array containing the results of the callbacks.
@author Borislav Peev <borislav.asdf@gmail.com>
*/

/**
A callback passed to {Array.map()}.

@def callback MapCallback ( item, index, array )
@param mixed
@param int
@param Array
*/
Object.defineProperty( Array.prototype, '__map', {
	value: Array.prototype.map,
	writable: false
} );

Object.defineProperty( Array.prototype, 'map', { value: function ( callback, thisArg ) {
		if ( callback instanceof Function ) {
			return this.__map( callback, thisArg );
		}

		var iend = this.length;
		var ret = new Array( iend );
		for ( var i = 0; i < iend; ++i ) {
			var item = this[ i ];
			ret[ i ] = item[ callback ]( item, i, this );
		}
		return ret;
	},
	writable: false
} );