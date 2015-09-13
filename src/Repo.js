"use strict";

var Git = require( './Git' );

class Repo {
	
	constructor ( project, remote, local ) {
		this._project = project;
		this._data = { remote: remote, local: local };
		this._remote = null;
		this._local = null;
	}

	Sync ( argv ) {
		var git = new Git( this._remote, this._local );

		if ( argv.clean && !git.clean() ) {
			return false;
		}
		
		if ( !git.sync() ) {
			return false;
		}

		return true;

	}

	Clean ( argv ) {
		var git = new Git( this._remote, this._local );

		return git.clean();
	}

	enter () {
		var vars = this._project.getVars();

		this._remote = vars.render( yaml( this._data.remote, vars ) );

		if ( this._remote.indexOf( '#' ) < 0 ) {
			this._remote += '#' + vars.get( 'branch' );
		}

		this._local = vars.render( yaml( this._data.local, vars ) );
		
	}

	exit () {
	}

	getRemote () {
		return this._remote;
	}

	getProject () {
		return this._project;
	}

	isUsingRepo ( repo ) {

		var src = Git.getFullRemote( this._remote );
		var dest = Git.getFullRemote( repo );

		return ( src.repo == dest.repo && src.branch == dest.branch );
	}

}

module.exports = Repo;