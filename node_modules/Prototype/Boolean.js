"use strict";

/**
 * Checks if argument is a boolean.
 * This function checks for both typeof and instanceof
 * to make sure the argument is a boolean.
 * @def static function Boolean.isBoolean ( boolean )
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */
Object.defineProperty( Boolean, 'isBoolean', { 
	value: function ( str ) {
		return typeof str == 'boolean' || str instanceof Boolean;
	},
	writable: true
} );

