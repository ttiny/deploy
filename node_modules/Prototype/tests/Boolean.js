"use strict";

Unitest( 'Boolean.isBoolean()', function ( test ) {

	test( !(true instanceof Boolean) && Boolean.isBoolean( true ) );
	test( typeof new Boolean( true ) == 'object' && Boolean.isBoolean( new Boolean( true ) ) );

} );