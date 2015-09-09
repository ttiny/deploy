"use strict";

var RockerCompose = require( './RockerCompose' );
var Docker = require( './Docker' );
var Repo = require( './Repo' );

class Project {

	constructor ( app, vars, data ) {

		this._app = app;
		this._vars = vars;

		if ( data.extends ) {
			var tmpl = app.getTemplate( data.extends );
			delete data.extends;
			data = tmpl.mergeDeep( data );
		}
		this._data = data;
		this._name = data.name;
		this._repo = null;
		this._docker = null;
		this._rockerCompose = null;

		if ( this._data.repo ) {
			this._repo = new Repo( this, this._data.repo );
		}

		if ( this._data.docker ) {
			this._docker = new Docker( this, this._data.docker );
		}
		
		if ( this._data[ 'rocker-compose' ] ) {
			this._rockerCompose = new RockerCompose( this, this._data[ 'rocker-compose' ] );
		}

	}

	Sync ( argv ) {
		if ( this._repo === null ) {
			throw new Error( 'Can not sync a project (' + this._name + ') without git "repo" configuration.' );
		}
		this._repo.enter();
		var ret = this._repo.Sync( argv );
		this._repo.exit();
		return ret;
	}

	Clean ( argv ) {
		if ( this._repo === null ) {
			throw new Error( 'Can not sync a project (' + this._name + ') without git "repo" configuration.' );
		}
		this._repo.enter();
		var ret = this._repo.Clean( argv );
		this._repo.exit();
		return ret;
	}

	Build ( argv ) {
		if ( this._docker === null ) {
			throw new Error( 'Can not build a project (' + this._name + ') without "docker" configuration.' );
		}
		this._docker.enter();
		var ret = this._docker.Build( argv );
		this._docker.exit();
		return ret;
	}

	Push ( argv ) {
		if ( this._docker === null ) {
			throw new Error( 'Can not push a project (' + this._name + ') without "docker" configuration.' );
		}
		this._docker.enter();
		var ret = this._docker.Push( argv );
		this._docker.exit();
		return ret;
	}

	Run ( argv ) {
		if ( this._rockerCompose === null ) {
			throw new Error( 'Can not run a project (' + this._name + ') without "rocker-compose" configuration.' );
		}
		this._rockerCompose.enter();
		var ret = this._rockerCompose.Run( argv );
		this._rockerCompose.exit();
		return ret;
	}

	Stop ( argv ) {
		if ( this._rockerCompose === null ) {
			throw new Error( 'Can not stop a project (' + this._name + ') without "rocker-compose" configuration.' );
		}
		this._rockerCompose.enter();
		var ret = this._rockerCompose.Stop( argv );
		this._rockerCompose.exit();
		return ret;
	}

	enter ( branch ) {
		var vars = this._vars;
		
		vars.push();

		vars.set( 'project', this._name );
		vars.set( 'branch', branch );
		vars.set( 'branch.tag', branch === 'master' ? 'latest' : branch );
		vars.set( 'branch.flat', branch.replace( /[^\d\w]/g, '' ) );

		var locals = this._data.vars;
		if ( locals instanceof Object ) {
			for ( var name in locals ) {
				vars.set( 'project.' + name, vars.render( locals[ name ] ) );
			}
		}
	}

	exit () {
		this._vars.pop();
	}

	isUsingRepo ( repo ) {
		if ( this._repo === null ) {
			return false;
		}
		this._repo.enter();
		var ret = this._repo.isUsingRepo( repo );
		this._repo.exit();
		return ret;
	}

	getRepo () {
		return this._repo;
	}

	getApp () {
		return this._app;
	}

	getVars () {
		return this._vars;
	}

	getName () {
		return this._name;
	}
}

module.exports = Project;