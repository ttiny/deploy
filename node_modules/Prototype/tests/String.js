"use strict";


Unitest( 'String.isString()', function ( test ) {


	test( !('asd' instanceof String) && String.isString( 'sad' ) );
	test( typeof new String() == 'object' && String.isString( new String ) );

} );

Unitest( 'String.indexOfEx()', function ( test ) {

	var r = 'left center right';
	var out = {};
	
	test( r.indexOfEx( 'center' ) == 5 );
	test( r.indexOfEx( 'center', undefined, out ) == 5 && out.length == 6 );
	test( r.indexOfEx( 'center', 6 ) == -1 );

	test( r.indexOfEx( /c[a-z]+r/ ) == 5 );
	test( r.indexOfEx( /c[a-z]+r/, undefined, out ) == 5 && out.length == 6 );
	test( r.indexOfEx( /c[a-z]+r/, 6 ) == -1 );
	

} );

Unitest( 'String.lastIndexOfEx()', function ( test ) {

	var r = 'left center right';
	var out = {};
	
	test( r.lastIndexOfEx( 'center' ) == 5 );
	test( r.lastIndexOfEx( 'center', undefined, out ) == 5 && out.length == 6 );
	test( r.lastIndexOfEx( 'center', 5 ) == 5 );
	test( r.lastIndexOfEx( 'center', 4 ) == -1 );

	test( r.lastIndexOfEx( /c[a-z]+r/ ) == 5 );
	test( r.lastIndexOfEx( /c[a-z]+r/, undefined, out ) == 5 && out.length == 6 );
	test( r.lastIndexOfEx( /c[a-z]+r/, 5 ) == 5 );
	test( r.lastIndexOfEx( /c[a-z]+r/, 4 ) == -1 );
	

} );

Unitest( 'String.splitFirst()', function ( test ) {

	var r = 'left center right'.splitFirst( ' ' );
	test( r.left == 'left' );
	test( r.right == 'center right' );
	
	var r = ' left center right'.splitFirst( ' ' );
	test( r.left == '' );
	test( r.right == 'left center right' );

	var s = 'leftright';
	var r = s.splitFirst( ' ' );
	test( r.left === s );
	test( s.right === undefined );


	var r = 'left\ncenter right'.splitFirst( /\s/ );
	test( r.left == 'left' );
	test( r.right == 'center right' );


} );

Unitest( 'String.splitLast()', function ( test ) {


	var r = 'left center right'.splitLast( ' ' );
	test( r.left == 'left center' );
	test( r.right == 'right' );
	
	var r = 'left center right '.splitLast( ' ' );
	test( r.left == 'left center right' );
	test( r.right == '' );

	var s = 'leftright';
	var r = s.splitLast( ' ' );
	test( r.left === s );
	test( s.right === undefined );



	/*var caught = false;
	try {
		var r = 'left\ncenter right'.splitLast( /\s/ );
	}
	catch ( e ) {
		caught = true;
	}
	test( caught );
	*/
	var r = 'left\ncenter right'.splitLast( /\s/ );
	test( r.left == 'left\ncenter' );
	test( r.right == 'right' );

} );

Unitest( 'String.startsWith()', function ( test ) {
	
	test( 'asd_qwe_zxc'.startsWith( 'asd' ) );
	test( !'asd_qwe_zxc'.startsWith( '!asd' ) );
	test( !'asd_qwe_zxc'.startsWith( 'qwe' ) );
	test( 'asd_qwe_zxc'.startsWith( 'qwe', 4 ) );
	test( !'asd_qwe_zxc'.startsWith( 'qwe', 5 ) );

} );

Unitest( 'String.endsWith()', function ( test ) {
	
	test( 'asd_qwe_zxc'.endsWith( 'zxc' ) );
	test( !'asd_qwe_zxc'.endsWith( '!zxc' ) );
	test( !'asd_qwe_zxc'.endsWith( 'qwe' ) );
	test( 'asd_qwe_zxc'.endsWith( 'qwe', 7 ) );
	test( !'asd_qwe_zxc'.endsWith( 'qwe', 6 ) );

} );

Unitest( 'String.count()', function ( test ) {

	test( 'asd'.count( 'sd' ) == 1 );
	test( 'asd'.count( 's' ) == 1 );
	test( 'asd'.count( 'a' ) == 1 );
	test( 'asaad'.count( 'a' ) == 3 );
	test( 'asaad'.count( 'aa' ) == 1 );
	test( 'aaa'.count( 'a' ) == 3 );
} );


Unitest( 'String.toFirstUpperCase()', function ( test ) {

	test( 'asd'.toFirstUpperCase() == 'Asd' );
	test( ' asd'.toFirstUpperCase() == ' asd' );
	
} );
