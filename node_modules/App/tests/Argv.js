var Argv = require( '../Argv.js' );

Unitest( 'Argv.parse()', function ( test ) {
	// parseArs
	var args = Argv.parse( [ '-arg1=value', '-flag', 'arg2', '-arg3=1', '-arg3=2', '-arg3', '--arg4', 'value4', '--arg5=value5', '--arg6' ] );
	test( JSON.stringify( args ) == JSON.stringify( { 'arg1': 'value', 'flag': true, '2': 'arg2', 'arg3': [ '1', '2', true ], 'arg4': 'value4', '-arg5': 'value5', 'arg6': true } ) );
} );
