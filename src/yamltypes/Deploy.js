"use strict";

var Yaml = require( 'js-yaml' );
var DeferredYaml = require( './Deferred' );
var ChildProcess = require( 'child_process' );
var Dry = require( '../Dry' );

class Deploy extends DeferredYaml {

	constructor ( data ) {
		super();
		data = data.splitFirst( ' ' );
		this._command = data.left;
		this._prjNameAndBranch = data.right;
	}
	
	resolve ( vars ) {
		var cmd = vars.render( this._command );
		var prjNameAndBranch = vars.render( this._prjNameAndBranch ).splitFirst( '#' );
		var app = vars.getApp();
		var projects = app.findProjectsByName( prjNameAndBranch.left );
		var good = true;
		for ( var project of projects ) {
			var branch = prjNameAndBranch.right;
			if ( branch === undefined ) {
				branch = app.getOnlyBranch( project );
			}
			if ( !String.isString( branch ) ) {
				console.warn( 'Couldn\'t auto decide appropriate branch for project', project.getName() + ', skipping.' );
				continue;
			}
			good = app.doSingleAction( cmd.toLowerCase().toFirstUpperCase(), project, branch );
			if ( !good ) {
				break;
			}
		}
		return null;
	}
}

module.exports = new Yaml.Type( '!deploy', {
	
	kind: 'scalar',
	
	construct: function ( data ) {
		return new Deploy( data );
	},
	
	instanceOf: Deploy

} );