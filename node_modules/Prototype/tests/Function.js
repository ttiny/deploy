"use strict";

Unitest( 'Function.define()', function ( test ) {

	var A = function () {};
	A.define( { test: function () { return this.qwe; }, qwe: 5 } );
	var a = new A();
	test( a.test() === 5 );

} );

Unitest( 'Function.static()', function ( test ) {

	var A = function () {};
	A.static( { test () { return this.qwe; }, qwe: 5 } );
	var a = new A();
	test( a.test === undefined );
	test( A.test() == 5 );

} );

Unitest( 'Function.extend()', function ( test ) {

	// test simple prototype
	function A () {

	}

	A.extend( Array, {
		size: function () {
			return this.length;
		}
	} );

	var a = new A();

	test( a instanceof A );
	test( a instanceof Array );
	test( a.size() === 0 );

	// test inheritance without own functions
	function C () {

	}

	C.extend( Array );
	C.prototype.test = 5;

	var c = new C();
	Array.prototype.test2 = 6;

	test( c instanceof C );
	test( c instanceof Array );
	test( c.test === 5 );
	test( Array.prototype.test === undefined );
	test( [].test === undefined );
	test( c.test2 === 6 );

	delete Array.prototype.test2;


} );

Unitest( 'Function.mixin()/Object.instanceof', function ( test ) {

	function B () {

	}

	B.prototype = {
		asd: 'qwe'
	};

	function A () {

	}

	A.mixin( B );

	var a = new A();

	test( a.asd == 'qwe' );
	test( a instanceof A );

	var c = {
		a: 1
	};

	var d = {
		b: 2
	};

	var e = {
		a: 11
	};

	B.mixin( c, d );

	test( new B().a == 1 );
	test( new B().b == 2 );
	var caught = false;
	try {
		B.mixin( e );
	}
	catch ( e ) {
		caught = true;
	}
	test( caught );

	B.mixin( e, ResolveMixins( {'a': c} ) );
	test( new B().a == 1 );
	
	B.mixin( e, ResolveMixins( {'a': e} ) );
	test( new B().a == 11 );
	
	B.mixin( { a: 12 }, ResolveMixins( {'a': B} ) );
	test( new B().a == 11 );

	class IFace1 {
		iface1_decl () {}
		iface2_decl () {}
	}
	
	class IFace2 extends IFace1 {

		iface3_decl () {}
	}
	
	class TTrait1 {
		constructor () {}
		iface1_decl () {}
		iface2_decl () {}
	}
	
	class TTrait2 {
		constructor () {}
		iface3_decl () {}
	}

	var A = function () {};
	A.mixin( TTrait1 );

	var caught = false;
	try { A.implement( TTrait1 ); }
	catch ( e ) { caught = true; }
	test( !caught );

	var caught = false;
	try { A.implement( IFace1 ); }
	catch ( e ) { caught = true; }
	test( !caught );

	test( !( (new A) instanceof IFace1 ) );
	test( (new A).instanceof( TTrait1 ) );
	test( (new A).instanceof( IFace1 ) );

	A.mixin( TTrait2 );

	var caught = false;
	try { A.implement( TTrait2 ); }
	catch ( e ) { caught = true; }
	test( !caught );

	var caught = false;
	try { A.implement( IFace2 ); }
	catch ( e ) { caught = true; }
	test( !caught );

	// var IFace = function () {};
	// IFace.define( { func: function () {} } );
	// var TTrait = function () {};
	// TTrait.define( { func: function () { return 1; } } ).implement( IFace );

	// var A = function () {};
	// A.mixin( TTrait );
	// test( (new A).instanceof( IFace ) );
} );

Unitest( 'Function.implement/Object.instanceof', function ( test ) {

	class IFace1 {
		constructor () {'iface1';}
		iface1_decl () {}
		iface2_decl () {}
	}
	
	class IFace2 extends IFace1 {
		constructor () { 'iface2'; }
		iface3_decl () {}
	}
	
	var A = class {};
	var caught = false;
	try { A.implement( IFace1 ); }
	catch ( e ) { caught = true; }
	test( caught );

	var A = class { 
		constructor () {}
		iface1_decl () {}
	}
	A.prototype.iface2_decl = 'notfn';

	var caught = false;
	try { A.implement( IFace1 ); }
	catch ( e ) { caught = true; }
	test( caught );

	var A = class { 
		constructor () {}
		iface1_decl () {}
		iface2_decl () {}
	}

	var caught = false;
	try { A.implement( IFace1 ); }
	catch ( e ) { caught = true; }
	test( !caught );

	var A = class { 
		constructor () {}
		iface1_decl () {}
		iface2_decl () {}
	}

	var caught = false;
	try { A.implement( IFace2 ); }
	catch ( e ) { caught = true; }
	test( caught );

	var A = class { 
		constructor () {}
		iface1_decl () {}
		iface3_decl () {}
	}

	var caught = false;
	try { A.implement( IFace2 ); }
	catch ( e ) { caught = true; }
	test( caught );

	var A = class { 
		constructor () {}
		iface1_decl () {}
		iface2_decl () {}
		iface3_decl () {}
	}

	var caught = false;
	try { A.implement( IFace2 ); }
	catch ( e ) { caught = true; }
	test( !caught );

	test( (new A).instanceof( IFace2 ) );
	test( (new A).instanceof( IFace1 ) );

	var A = class { 
		constructor () {}
		iface1_decl () {}
		iface2_decl () {}
	}
	class B extends A {
		iface3_decl () {}
	}
	
	var caught = false;
	try { A.implement( IFace1 ); }
	catch ( e ) { caught = true; }
	test( !caught );

	var caught = false;
	try { B.implement( IFace2 ); }
	catch ( e ) { caught = true; }
	test( !caught );

	test( (new B) instanceof A );
	test( (new B).instanceof( A ) );
	test( (new A).instanceof( IFace1 ) );
	test( !( (new A) instanceof IFace1 ) );
	test( !(new A).instanceof( IFace2 ) );
	test( !( (new A) instanceof IFace2 ) );
	test( (new B).instanceof( IFace1 ) );
	test( (new B).instanceof( IFace2 ) );
	test( !( (new B) instanceof IFace1 ) );
	test( !( (new B) instanceof IFace2 ) );

} );


Unitest( 'Function.bind()', function ( test ) {

	var obj = {}

	var a = function () {
		return this;
	};

	test( a() === this );
	test( a.bind( obj )() === obj );

	var b = function () {
		return arguments;
	};

	var args = b.bind( obj )( 1, 2, 3 );
	test( args[0] == 1 && args[1] == 2 && args[2] == 3 && args.length == 3 );

} );

Unitest( 'Function.bindArgsAfter()', function ( test ) {

	var a = function () {
		return arguments;
	};

	var b = a.bindArgsAfter( 2, 3 );
	test( b()[0] == 2 );
	test( b()[1] == 3 );
	test( b( 1 )[0] == 1 );
	test( b( 1 )[1] == 2 );
	test( b( 1 )[2] == 3 );

} );

Unitest( 'Function.bindArgsBefore()', function ( test ) {

	var a = function () {
		return arguments;
	};

	var b = a.bindArgsBefore( 2, 3 );
	test( b()[0] == 2 );
	test( b()[1] == 3 );
	test( b( 1 )[0] == 2 );
	test( b( 1 )[1] == 3 );
	test( b( 1 )[2] == 1 );

} );
