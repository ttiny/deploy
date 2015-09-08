"use strict";

var Rocker = require( './Rocker' );

function Project ( app, data ) {

	this._app = app;

	if ( data.extends ) {
		var tmpl = app.getTemplate( data.extends );
		delete data.extends;
		data = tmpl.mergeDeep( data );
	}
	this._data = data;
	this._name = data.name;
	this._repo = null;
	this._rocker = null;
	this._docker = null;
}

Project.define( {

	Sync: function () {
		if ( this._docker === null ) {
			throw new Error( 'Can not sync a project (' + this._name + ') without git repos configuration.' );
		}
	},

	Build: function () {
		if ( this._docker === null ) {
			throw new Error( 'Can not build a project (' + this._name + ') without Docker configuration.' );
		}
	},

	Push: function () {
		if ( this._docker === null ) {
			throw new Error( 'Can not push a project (' + this._name + ') without Docker configuration.' );
		}
	},

	Run: function () {
		if ( this._rocker === null ) {
			throw new Error( 'Can not run a project (' + this._name + ') without rocker-compose configuration.' );
		}
	},

	Stop: function () {
		if ( this._rocker === null ) {
			throw new Error( 'Can not stop a project (' + this._name + ') without rocker-compose configuration.' );
		}
	},

	enter: function ( branch ) {
		var vars = this._app.getVars();
		vars.push( 'project' );
		vars.set( 'project', this._name );
		vars.set( 'branch', branch );
		vars.set( 'branch.tag', branch === 'master' ? 'latest' : branch );
		vars.set( 'branch.flat', branch.replace( /[^\d\w]/g, '' ) );

		var locals = this._data.vars;
		if ( locals instanceof Object ) {
			for ( var name in locals ) {
				vars.set( name, vars.render( locals[ name ] ) );
			}
		}

		if ( this._data.rocker ) {
			this._rocker = new Rocker( this, this._data.rocker )
		}

		console.log( vars );
	},

	exit: function () {
		this._app.getVars().pop();
	},

	isUsingRepo: function ( repo ) {
		return false;
	},

	getRepo: function () {
		return this._repos[ 0 ];
	},

	getApp: function () {
		return this._app;
	}
} );

module.exports = Project;