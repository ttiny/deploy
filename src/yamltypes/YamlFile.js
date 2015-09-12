"use strict";

var Yaml = require( 'js-yaml' );
var DeferredYaml = require( './Deferred' );
var Fs = require( 'fs' );

class YamlFile extends DeferredYaml {	
	
	constructor ( data ) {
		super();
		this._file = data;
	}

	resolve ( vars ) {
		var file = vars.render( this._file );
		if ( Fs.existsSync( file ) ) {
			return yaml( LoadYaml( file ), vars );
		}
		return null;
	}
}

module.exports = new Yaml.Type( '!yamlfile', {
	
	kind: 'scalar',
	
	construct: function ( data ) {
		return new YamlFile( data );
	},
	
	instanceOf: YamlFile

} );