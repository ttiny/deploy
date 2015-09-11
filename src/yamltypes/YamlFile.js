"use strict";

var Yaml = require( 'js-yaml' );
var DeferredYaml = require( './Deferred' );
var Fs = require( 'fs' );

// if this is class and it extends this is undefined in the constructor with node 4.0.0
function YamlFile ( data ) {
	this._file = data;
}

YamlFile.extend( DeferredYaml, {	
	resolve ( vars ) {
		var file = vars.render( this._file );
		if ( Fs.existsSync( file ) ) {
			return yaml( LoadYaml( file ), vars );
		}
		return null;
	}
} );

module.exports = new Yaml.Type( '!yamlfile', {
	
	kind: 'scalar',
	
	construct: function ( data ) {
		return new YamlFile( data );
	},
	
	instanceOf: YamlFile

} );