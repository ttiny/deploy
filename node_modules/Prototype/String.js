"use strict";

/**
 * Checks if argument is a string.
 * This function checks for both typeof and instanceof
 * to make sure the argument is a string.
 * @def static function String.isString ( string )
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */
Object.defineProperty( String, 'isString', { 
	value: function ( str ) {
		return typeof str == 'string' || str instanceof String;
	},
	writable: true
} );




/**
 * Extends the built-in {String.indexOfEx} with support of {RegExp}.
 *
 * @def function String.indexOfEx ( search:string|RegExp, offset:int = 0, out:Object = undefined )
 *
 * @param string|RegExp Subject to search for.
 * @param int Offset to start the search at.
 * @param Object Optional object to receive the matched subject's length in its `length` property.
 * @return int -1 if the search value is not found.
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */

Object.defineProperty( String.prototype, 'indexOfEx', { 
	value: function ( search, offset, out ) {
		if ( search instanceof RegExp ) {

			if ( offset > 0 ) {
				var tLastIndex = search.lastIndex;
				var ret = search.exec( this.substr( offset ) );
				search.lastIndex = tLastIndex;
				
				if ( ret !== null ) {
					if ( out ) {
						out.length = ret[0].length;
					}
					return ret.index + offset;
				}
				return -1;
			}
			else {
				var tLastIndex = search.lastIndex;
				search.lastIndex = 0;
				var ret = search.exec( this );
				search.lastIndex = tLastIndex;

				if ( ret !== null ) {
					if ( out ) {
						out.length = ret[0].length;
					}
					return ret.index;
				}
				return -1;
			}
		}
		else {
			var ret = this.indexOf( search, offset );
			if ( out && ret >= 0 ) {
				out.length = search.length;
			}
			return ret;
		}
	},
	writable: true
} );




/**
 * Extends the built-in {String.lastIndexOfEx} with support of {RegExp}.
 *
 * @def function String.lastIndexOfEx ( search:string|RegExp, offset:int = this.length, out:Object = undefined )
 *
 * @param string|RegExp Subject to search for.
 * @param int Offset to start the search at.
 * @param Object Optional object to receive the matched subject's length in its `length` property.
 * @return int -1 if the search value is not found.
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */

Object.defineProperty( String.prototype, 'lastIndexOfEx', { 
	value: function ( search, offset, out ) {
		if ( search instanceof RegExp ) {
			offset = offset || this.length;
			var last, m;
			if ( !search.global ) {
				if ( search._lastIndexOf ) {
					search = search._lastIndexOf;
				}
				else {
					//if no global flag we will end in infinite loop
					var flags = (search.ignoreCase ? 'i' : '') +
					            (search.multiline ? 'm' : '') +
					            'g';
					
					// cache our regexp
					search = ( search._lastIndexOf = new RegExp( search.source, flags ) );
				}
				//throw new Error( 'String.lastIndexOf for RegExp without g flag will loop forever.' );
			}
			
			// js lastIndex is shit
			var tLastIndex = search.lastIndex;
			search.lastIndex = 0;
			while ( (m = search.exec( this )) && m.index <= offset ) {
				last = m;
			}
			search.lastIndex = tLastIndex;

			if ( last ) {
				if ( out ) {
					out.length = last[0].length;
				}
				return last.index;
			}
			return -1;
		}
		else {
			var ret = this.lastIndexOf( search, offset );
			if ( out && ret >= 0 ) {
				out.length = search.length;
			}
			return ret;
		}
	},
	writable: true
} );




/**
 * Splits a string on the first occurence of substring.
 * @def function String.splitFirst ( search:string|RegExp )
 * @return object Object will have two properties -
 * 'left', which could be reference to the original string, and 'right' which could be undefined.
 * * Both properties can be empty string.
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */
Object.defineProperty( String.prototype, 'splitFirst', { 
	value: function ( search ) {
		var ret = { left: this, right: undefined, length: 0 };
		var i = this.indexOfEx( search, undefined, ret );
		if ( i >= 0 ) {
			ret.left = this.substr( 0, i );
			ret.right = this.substr( i + ret.length );
		}
		return ret;
	},
	writable: true
} );




/**
 * Splits a string on the last occurence of substring.
 * @def function String.splitLast ( search:string|RegExp )
 * @return {@see String.splitFirst()}
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */
Object.defineProperty( String.prototype, 'splitLast', { 
	value: function ( search ) {

		var ret = { left: this, right: undefined, length: 0 };
		var i = this.lastIndexOfEx( search, undefined, ret );
		if ( i >= 0 ) {
			ret.left = this.substr( 0, i );
			ret.right = this.substr( i + ret.length );
		}
		return ret;

	},
	writable: true
} );




/**
@def bool function String.startsWith ( searchString:string, position:int = "0" )
@param String to search for.
@param Position in the string where to start the search.
*/
if ( String.prototype.startsWith === undefined ) {
	Object.defineProperty( String.prototype, 'startsWith', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function ( searchString, position ) {
			position = position || 0;
			if ( this.length < position + searchString.length ) {
				return false;
			}
			return this.indexOf( searchString, position ) === position;
		}
	} );


	

}


/**
@def bool function String.endsWith ( searchString:string, position:int = "this.length" )
@param String to search for.
@param Treat the string as if it was this long.
*/
if ( String.prototype.endsWith === undefined ) {
	Object.defineProperty( String.prototype, 'endsWith', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function ( searchString, position ) {
			var len = searchString.length;
			position = position || this.length;
			if ( len > position ) {
				return false;
			}
			return this.slice( position - len, position ) === searchString;
		}
	} );


	

}


/**
 * Counts the occurences of substring in a string.
 * @def function String.count ( search:string )
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */
Object.defineProperty( String.prototype, 'count', { 
	value: function ( search ) {
		var ret = 0;
		for ( var i = 0; (i = this.indexOf( search, i )) >= 0; i += search.length ) {
			++ret;
		}
		return ret;
	},
	writable: true
} );


/**
Converts the first letter of the string to upper case and returns the new string.

@def function String.toFirstUpperCase ()
@return String
@author Borislav Peev <borislav.asdf@gmail.com>
*/
Object.defineProperty( String.prototype, 'toFirstUpperCase', { 
	value: function ( search ) {
		return this[ 0 ].toUpperCase() + this.slice( 1 );
	},
	writable: true
} );

