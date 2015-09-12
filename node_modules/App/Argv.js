/**
A collection of utilities for working with command line arguments.
@def namespace Argv
@author Borislav Peev <borislav.asdf@gmail.com>
*/

/**
Parses a list of command line arguments.

This function parses the list of arguments into an object. It reconginezes the
commonly used `-name=value` format for named arguments or -name for flag
arguments. Other arguments will be named by their index. Arguments may appear
multiple times.

```
-arg1=value -flag arg2 -arg3=1 -arg3=2 -arg3
```
will become
```js
{ arg1: 'value', flag: true, "2": 'arg2', arg3: [ '1', '2', true ] }
```

@def function Argv.parse ( args )
@param string[]|undefined List of arguments to be parsed. If ommited
    process.argv will be used instead (first two arguments being the node
    executable and the script name will be ignored).
@return object|null null if the argument list is empty.
*/
var Argv = {
	parse ( args ) {
		if ( args === undefined ) {
			args = process.argv.slice( 2 );
		}
		if ( args.length == 0 ) {
			return null;
		}
		var argv = {};
		for ( var i = 0; i < args.length; ++i ) {
			var arg = args[i];
			var p = arg.indexOf( '=' );
			var key = null;
			var value = null;
			if ( p >= 0 ) {
				var start = ( arg.charAt( 0 ) == '-' ? 1 : 0 );
				key = arg.substr( start, p  - 1 );
				value = arg.substr( p + 1, arg.length - p );
			}
			else {
				if ( arg.charAt( 0 ) == '-' ) {
					key = arg.substr( 1 );
					value = true;
				}
				else {
					key = i;
					value = arg;
				}
			}

			if ( !argv.hasOwnProperty( key ) ) {
				argv[key] = value;
			}
			else {
				if ( argv[key] instanceof Array ) {
					argv[key].push( value );
				}
				else {
					argv[key] = [ argv[key], value ];
				}
			}
		}
		return argv;
	}
};

module.exports = Argv;