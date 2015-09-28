"use strict";

var Git = require( './Git' );

class Repo {
	
	constructor ( project, remote, local ) {
		this._project = project;
		this._data = { remote: remote, local: local };
		this._remote = null;
		this._local = null;
		this._isTag = false;
	}

	Sync () {
		var argv = this._project.getApp().getArgv();
		var git = new Git( this._remote, this._local, this._isTag );

		if ( argv.clean && !git.clean() ) {
			return false;
		}
		
		if ( !git.sync() ) {
			return false;
		}

		return true;

	}

	Clean () {
		var git = new Git( this._remote, this._local, this._isTag );

		return git.clean();
	}

	enter () {

		var argv = this._project.getApp().getArgv();
		var vars = this._project.getVars();

		this._remote = vars.render( yaml( this._data.remote, vars ) );
		this._isTag = false;

		if ( this._remote.indexOf( '#' ) < 0 ) {
			if ( argv.tag ) {
				this._remote += '#' + vars.render( argv.tag );
				this._isTag = true;
			}
			else {
				this._remote += '#' + vars.get( 'branch' );
			}
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

	filter ( repo ) {
		return this.isUsingRepo( repo );
	}

	isUsingRepo ( repo ) {

		var src = Git.getFullRemote( this._remote );
		var dest = Git.getFullRemote( repo );

		return ( src.repo == dest.repo && src.branch == dest.branch );
	}

}

module.exports = Repo;