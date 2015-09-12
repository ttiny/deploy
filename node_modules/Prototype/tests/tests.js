require( '../Prototype.js' );
require( 'Unitest' ).enable();

if ( process.argv[2] == 'nocolor' ) {
	Unitest.noColor();
}

require( './Object.js' );
require( './Array.js' );
require( './String.js' );
require( './Function.js' );
require( './Number.js' );
require( './Boolean.js' );