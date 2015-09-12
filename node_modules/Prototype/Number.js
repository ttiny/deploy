"use strict";

/**
 * Checks if argument is a number.
 * This function checks for both typeof and instanceof
 * to make sure the argument is a number.
 * @def static function Number.isNumber ( number )
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */
Object.defineProperty( Number, 'isNumber', { 
	value: function ( str ) {
		return typeof str == 'number' || str instanceof Number;
	},
	writable: true
} );

