"use strict";

require( 'Unitest' ).enable();

if ( process.argv[2] == 'nocolor' ) {
	Unitest.noColor();
}

require( './Argv.js' );
require( './Config.js' );
require( './HttpApp.js' );
require( './App.js' );