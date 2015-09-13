"use strict";

Unitest( 'Object.merge()', function ( test ) {

	var a = { a: 2, b: 3 }.merge( { a: 3, c: 4 } );
	test( a.a === 3 );
	test( a.b === 3 );
	test( a.c === 4 );

} );

Unitest( 'Object.mergeDeep()', function ( test ) {

	var a = { a: 2, b: 3 }.mergeDeep( { a: 3, b: { b11: 11, b22: 22 } , c: 4 } );
	test( a.a === 3 );
	test( a.b instanceof Object && a.b.b11 === 11 );
	test( a.b instanceof Object && a.b.b22 === 22 );
	test( a.c === 4 );
	
	var a = { a: 2, b: { b00: 0 } }.mergeDeep( { a: 3, b: { b11: 11, b22: 22 } , c: 4 } );
	test( a.a === 3 );
	test( a.b instanceof Object && a.b.b00 === 0 );
	test( a.b instanceof Object && a.b.b11 === 11 );
	test( a.b instanceof Object && a.b.b22 === 22 );
	test( a.c === 4 );

	var a = { a: { b: { c: 1 } } }.mergeDeep( { a: { b: null } } );
	test( a.a.b === null );

} );

Unitest( 'Object.duplicate()', function ( test ) {

	class C {

	}

	var a = { a: {}, b: 3, c: new C };
	test( a.duplicate() !== a );
	test( a.duplicate().a !== a.a );
	test( a.duplicate().c === a.c );
	test( a.duplicate().duplicate().c === a.c );
	test( a.duplicate().b == a.b );

} );

Unitest( 'Object.isObject()', function ( test ) {

	test( !Object.isObject( new String ) );
	test( Object.isObject( {} ) );
	test( !Object.isObject( 1 ) );
	test( !Object.isObject( 'asd' ) );

} );

Unitest( 'Object.newArgs()', function ( test ) {

	var A = function () {
	};

	var B = function () {
		return arguments[1];
	};

	test( Object.newArgs( A, [ 1, 2 ] ) instanceof A );
	test( Object.newArgs( B, [ 1, 2 ] ) === 2 );

} );

Unitest( 'Object.values()', function ( test ) {

	test.eq( Object.values( { a: 1, b: 2 } ), [ 1, 2 ] );

} );

Unitest( 'Object.filter()', function ( test ) {

	test.eq( { a: 1, b: 2, c: 3 }.filter( function ( val, key ) { return key != 'b' } ) , { a: 1, c: 3 } );
} );