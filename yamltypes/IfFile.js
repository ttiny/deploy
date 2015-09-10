"use strict";

var Yaml = require( 'js-yaml' );
var DeferredYaml = require( './Deferred' );
var Fs = require( 'fs' );

// if this is class and it extends this is undefined in the constructor with node 4.0.0
function IfFile ( data ) {
	this._yaml = ( data[ 0 ] == '!' );
	this._file = this._yaml ? data.slice( 1 ) : data;
}

IfFile.extend( DeferredYaml, {	
	resolve ( vars ) {
		var file = vars.render( this._file );
		if ( Fs.existsSync( file ) ) {
			return this._yaml ? yaml( LoadYaml( file ), vars ) : Fs.readFileSync( file, 'utf8' );
		}
		return null;
	}
} );

module.exports = new Yaml.Type( '!iffile', {
	
	kind: 'scalar',
	
	construct: function ( data ) {
		debugger;
		return new IfFile( data );
	},
	
	instanceOf: IfFile

} );