var Argv = require( '../Argv.js' );

Unitest( 'Argv.parse()', function ( test ) {
	// parseArs
	var args = Argv.parse( [ '-arg1=value', '-flag', 'arg2', '-arg3=1', '-arg3=2', '-arg3' ] );
	test( JSON.stringify( args ) == JSON.stringify( { 'arg1': 'value', 'flag': true, '2': 'arg2', 'arg3': [ '1', '2', true ] } ) );
} );
