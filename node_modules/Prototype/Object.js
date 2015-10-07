"use strict";

(function () {
	
	var _checkImplementation = function ( proto, clas ) {
		var __implements = proto.__implements;
		if ( !(__implements instanceof Array) ) {
			return false;
		}
		
		for ( var i = __implements.length - 1; i >= 0; --i ) {
			if ( clas === __implements[ i ] ) {
				return true;
			}
		}
		return false;
	};

	Object.defineProperty( Object.prototype, 'instanceof', { value: function ( clas ) {
			// this crashes if not used with functions, can be fixed but not worth the performance cost
			if ( this instanceof clas ) {
				return true;
			}

			var proto = Object.getPrototypeOf( this );
			
			do {
				if ( _checkImplementation( proto, clas ) ) {
					return true;
				}
				// skip built ins
				if ( proto === Object ||
				     proto === Array ||
				     proto === Function ||
				     proto === String ||
				     proto === Number ||
				     proto === Boolean ) {

					break;
				}
				proto = Object.getPrototypeOf( proto );
			} while ( proto );

			return false;
		},
		writable: false
	} );

})();

/**
 * Copies references of properties from another object to this one.
 * @def function Object.merge ( object )
 * @param Object
 * @return this
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */
Object.defineProperty( Object.prototype, 'merge', {
	value: function ( object ) {
		var keys = Object.getOwnPropertyNames( object );
		for ( var i = 0, iend = keys.length; i < iend; ++i ) {
			var key = keys[ i ];
			this[ key ] = object[ key ];
		}
		return this;
	},
	writable: true
} );


/**
 * Copies references of properties from another object to this one recusively.
 * If a property of this object that is not an Object is found in the object
 * to be merged with, the property will be replaced.
 * @def function Object.mergeDeep ( object )
 * @param Object
 * @return this
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */
Object.defineProperty( Object.prototype, 'mergeDeep', {
	value: function ( object ) {
		var keys = Object.getOwnPropertyNames( object );
		for ( var i = 0, iend = keys.length; i < iend; ++i ) {
			var key = keys[ i ];
			var existing = this[ key ];
			var value = object[ key ];
			if ( Object.isObject( existing ) && Object.isObject( value ) ) {
				existing.mergeDeep( value );
			}
			else {
				this[ key ] = value;
			}
		}
		return this;
	},
	writable: true
} );


/**
 * Creates object with duplicates of the properties of this object.
 * This function works recursively and will call .duplicate() for the
 * properties that implement this function. Objects of custom classes
 * will not be duplicated but passed as reference.
 * @def function Object.duplicate ()
 * @return Object
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */
Object.defineProperty( Object.prototype, 'duplicate', {
	value: function () {
		if ( !Object.isObject( this ) ) {
			return this;
		}
		var ret = {};
		var keys = Object.getOwnPropertyNames( this );
		for ( var i = 0, iend = keys.length; i < iend; ++i ) {
			var key = keys[ i ];
			var item = this[ key ];
			if ( item instanceof Object && item.duplicate instanceof Function ) {
				ret[ key ] = item.duplicate();
			}
			else {
				ret[ key ] = item;
			}
		}
		return ret;
	},
	writable: true
} );





/**
 * Checks if argument is an Object and not a subclass of Object.
 * @def static bool function Object.isObject ( obj:mixed )
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */
Object.defineProperty( Object, 'isObject', { 
	value: function ( obj ) {
		return obj instanceof Object && Object.getPrototypeOf( obj ) === Object.prototype;
	},
	writable: true
} );



/**
 * Applies arguments to a constructor.
 * Credits http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible.
 * @def static mixed function Object.newArgs ( obj:Object, args:array )
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */
Object.defineProperty( Object, 'newArgs', { 
	value: function ( ctor, args ) {
		return new ( Function.prototype.bind.apply( ctor, [ null ].concat( args ) ) );
	},
	writable: true
} );



/**
 * Retrieves the values of all own properties.
 * @def static bool function Object.values ( obj:mixed )
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */
Object.defineProperty( Object, 'values', { 
	value: function ( obj ) {
		var keys = Object.keys( obj );
		var values = new Array( keys.length );
		for ( var i = 0, iend = keys.length; i < iend; ++i ) {
			values[i] = obj[ keys[i] ];
		}
		return values;
	},
	writable: true
} );





/**
 * Filters out all properties for which the callback is not true.
 * @def static bool function Object.filter ( callback:Object.FilterCallback, thisArg:mixed|undefined )
 * @return this
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */

/**
@def callback Object.FilterCallback ( value, key, object )
*/
Object.defineProperty( Object.prototype, 'filter', { 
	value: function ( callback, thisArg ) {
		var keys = Object.keys( this );
		for ( var i = 0, iend = keys.length; i < iend; ++i ) {
			var key = keys[i];
			if ( callback.call( thisArg, this[key], key, this ) !== true ) {
				delete this[key];
			}
		}
		return this;
	},
	writable: true
} );

