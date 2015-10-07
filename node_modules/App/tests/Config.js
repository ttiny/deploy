var Config = require( '../Config.js' );

// Unitest.only( true, 'Config.relative' );

Unitest( 'Readme.sample', function ( test ) {
	var cfg = new Config( {
		shared: {
			separator: ', '
		},

		// we have absolute reference {name.full} and dynamic value {1}
		my_name: 'my name is {name.full}; i am {1} years old.',
		
		name: {
			first: 'tosho',
			last: 'afrikanski',
			
			// this is relative reference from the current node (_) or from the parent node (__)
			full: '{_.last}{__.shared.separator}{_.first}'
		}
	} );

	test( cfg.get( 'my_name', 30 ) == 'my name is afrikanski, tosho; i am 30 years old.' );
} );

Unitest( 'Config.sample 1', function ( test ) {
	var ENG = new Config( { hello: 'hello', bye: 'bye' } );
	var DEU = new Config( { hello: 'hallo', bye: 'auf wiedersehen' }, ENG );
	var langs = new Config( { hello: 'holla' }, DEU );
	test ( langs.hello == 'holla' );
	test ( langs.bye == 'auf wiedersehen' );
} );

Unitest( 'Config.sample 2', function ( test ) {
	var cfg = new Config( { a: '{b.a}', b: { a: 'ba', b: 'bb {1}', parent_a: '{__.a}', parent_c: '{_.__._.c.a}', this_a: '{_.a}' }, c: { a: 'ca {1}' } } );

	test( cfg.get( 'a' ) == 'ba' );
	test( cfg.get( 'b.b', '1' ) == 'bb 1' );
	test( cfg.get( 'b.parent_a' ) == 'ba' );
	test( cfg.get( 'b.parent_c', '2' ) == 'ca ' );
	test( cfg.get( 'b.this_a' ) == 'ba' );
} );

Unitest( 'Config.*', function ( test ) {

	var cfg = new Config( { a: { b: 2 } } );
	var cfg2 = new Config( { a: 1 }, cfg );
	test( cfg2.get( 'a.b' ) == 2 );

	var cfg = new Config( { a: { b: 2 } } );
	var cfg2 = new Config( { a: { c: 3 } }, cfg );
	test.eq( cfg2.get( 'a.*' ) , { 'a.b': 2, 'a.c': 3 } );

	var cfg = new Config( { a: 1, b: 2 } );
	test( cfg instanceof Config );
	test( cfg.a == 1 );

	var cfg2 = new Config( { b: 3, c: 4 }, cfg );
	test( cfg2 instanceof Config );
	test( cfg2.a == 1 );
	test( cfg2.b == 3 );
	test( cfg2.Parent.b == 2 );

	var cfg = new Config( { a: 1, b: 2 } );
	test( cfg.get( 'a' ) === 1 );

	var cfg2 = new Config( { a: 2, b: 1 }, cfg );
	test( cfg2.get( 'a' ) === 2 );

	var cfg2 = new Config( { c: 'ccc', d: '{a} {b} {c}' }, cfg );
	test( cfg2.get( 'a' ) === 1 );
	test( cfg2.get( 'c' ) == 'ccc' );
	test( cfg2.get( 'd' ) == '1 2 ccc' );

	cfg2.e = 'ee';
	test( cfg2.get( 'e' ) == 'ee' );
	test( cfg.get( 'e' ) === undefined );

	var cfg = new Config( { a: { b: { c: 1, d: '{1}' }, bb: 2 } } );
	test( cfg.a.b.c == 1 );
	test( cfg.get( 'a.b.c' ) == 1 );
	test( cfg.get( 'a.b.d', 2 ) == 2 );
	test( cfg.get( 'a.b.d', function () { return 3; } ) == 3 );

	var m = cfg.match( 'a.*' );
	test( Object.keys( m ).length == 2 );
	test( m['a.b'].Name == 'a.b' );
	test( m['a.b'].Value.c == 1 );
	test( m['a.bb'].Name == 'a.bb' );
	test( m['a.bb'].Value == 2 );

	var m = cfg.match( 'a.**' );
	test( Object.keys( m ).length == 4 );
	test( m['a.b.d'].Name == 'a.b.d' );
	test( m['a.b.d'].Value == '{1}' );
	test( m['a.b.d'].Matches[1] == 'b.d' );

	var cfg = new Config( { 'bb00': '11', 'aa00': '00', 'aabb': { 'ccdd': '{1} {aabb.eeff}', 'eeff': function () { return '--'; } } } );
	test( cfg.get( 'aabb.ccdd' ) == ' --' );
	test( cfg.get( 'aabb.ccdd', 1 ) == '1 --' );
	test( cfg.get( 'aa*0' )['aa00'] == '00' );
	test( Object.keys( cfg.get( 'aa*0' ) ).length == 1 );
	test( Object.keys( cfg.get( 'aa**' ) ).length == 3 );
	test( cfg.get( 'aa**' )['aabb.ccdd'] == ' --' );
	test( cfg.get( 'aa**', 2 )['aabb.ccdd'] == '2 --' );

} );

Unitest( 'Config.relative', function ( test ) {
	var cfg = new Config( { 'bb00': '11', 'aa00': '00', 'aabb': { 'ccdd': '{1} {_.eeff}', 'eeff': function () { return '--'; } } } );
	test( cfg.get( 'aabb.ccdd' ) == ' --' );
	test( cfg.get( 'aabb.ccdd', 1 ) == '1 --' );
	test( cfg.get( 'aa*0' )['aa00'] == '00' );
	test( Object.keys( cfg.get( 'aa*0' ) ).length == 1 );
	test( Object.keys( cfg.get( 'aa**' ) ).length == 3 );
	test( cfg.get( 'aa**' )['aabb.ccdd'] == ' --' );
	test( cfg.get( 'aa**', 2 )['aabb.ccdd'] == '2 --' );
} );

Unitest( 'Config.set', function ( test ) {

	var cfg = new Config( {} );
	cfg.set( 'A', 1 );
	test.eq( cfg.get( 'A' ), 1 );

	var cfg = new Config( { A: 1, B: 2 } );
	cfg.set( 'B', 3 );
	test.eq( cfg.get( 'B' ), 3 );

	var cfg = new Config( { A: 1, B: { C: 3 } } );
	cfg.set( 'B.C', 4 );
	test.eq( cfg.get( 'B.C' ), 4 );

	var cfg = new Config( { A: 1, B: 2 } );
	cfg.set( 'B.C', 3 );
	test.eq( cfg.get( 'B.C' ), 3 );

	var cfg2 = new Config( { A: 1, B: {} } );
	var cfg = new Config( { A: 1 }, cfg2 );
	cfg.set( 'B.C', 3 );
	test.eq( cfg.get( 'B.C' ), 3 );
	test.eq( cfg2.get( 'B.C' ), 3 );

	var cfg2 = new Config( { A: 1 } );
	var cfg = new Config( { A: 1 }, cfg2 );
	cfg.set( 'B.C', 3 );
	test.eq( cfg.get( 'B.C' ), 3 );
	test.eq( cfg2.get( 'B.C' ), undefined );


} );