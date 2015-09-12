"use strict";

Unitest( 'Number.isNumber()', function ( test ) {


	test( !(5 instanceof Number) && Number.isNumber( 5 ) );
	test( typeof new Number( 5 ) == 'object' && Number.isNumber( new Number( 5 ) ) );
	test( !(5.5 instanceof Number) && Number.isNumber( 5.5 ) );
	test( typeof new Number( 5.5 ) == 'object' && Number.isNumber( new Number( 5.5 ) ) );

} );
