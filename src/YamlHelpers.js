"use strict";

var Yaml = require( 'js-yaml' );
var Cmd = require( './yamltypes/Cmd' );
var YamlFile = require( './yamltypes/YamlFile' );
var YamlFiles = require( './yamltypes/YamlFiles' );
var TextFile = require( './yamltypes/TextFile' );
var DeferredYaml = require( './yamltypes/Deferred' );
var Fs = require( 'fs' );

Yaml.DEPLOY_SCHEMA = Yaml.Schema.create( Yaml.DEFAULT_FULL_SCHEMA, [ Cmd, YamlFile, YamlFiles, TextFile ] );

global.yaml = function ( yaml, vars ) {
	if ( yaml instanceof DeferredYaml ) {
		return yaml.resolve( vars );
	}

	return yaml;
}

global.LoadYaml = function ( file ) {
	if ( !Fs.existsSync( file ) ) {
		return null;
	}
	var config = Fs.readFileSync( file, 'utf8' );
	return Yaml.load( config, { filename: file, schema: Yaml.DEPLOY_SCHEMA } );
}

global.LoadYamlString = function ( str ) {
	return Yaml.load( str, { schema: Yaml.DEPLOY_SCHEMA } );
}