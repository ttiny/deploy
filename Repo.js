"use strict";

var Submodule = require( './Submodule' );
var Git = require( './Git' );

class Repo {
	
	constructor ( project, data ) {
		this._project = project;
		this._data = data;
		this._remote = null;
		this._local = null;
		this._submodules = [];

		var submodules = data.submodules;
		if ( submodules instanceof Object ) {
			for ( var remote in submodules ) {
				this._submodules.push( new Submodule(
					this,
					{ remote: remote, local: submodules[ remote ] }
				) );
			}
		}
	}

	Sync ( argv ) {
		var git = new Git( this._project.getVars(), this._remote, this._local );

		if ( argv.clean && !git.clean() ) {
			return false;
		}
		
		if ( !git.sync() ) {
			return false;
		}

		var submodules = this._submodules;
		for ( var i = 0, iend = submodules.length; i < iend; ++i ) {
			var submodule = submodules[ i ];
			submodule.enter();
			var ret = submodule.Sync( argv );
			submodule.exit();
			if ( ret === false ) {
				return false;
			}
		}

		return true;

	}

	Clean ( argv ) {
		var git = new Git( this._project.getVars(), this._remote, this._local );

		var submodules = this._submodules;
		for ( var i = 0, iend = submodules.length; i < iend; ++i ) {
			var submodule = submodules[ i ];
			submodule.enter();
			var ret = submodule.Clean( argv );
			submodule.exit();
			if ( ret === false ) {
				return false;
			}
		}
		
		return git.clean();
	}

	enter () {
		var vars = this._project.getVars();

		vars.push();

		this._remote = vars.render( this._data.remote );
		this._local = vars.render( this._data.local );
		

		var locals = this._data.vars;
		if ( locals instanceof Object ) {
			for ( var name in locals ) {
				vars.set( 'repo.' + name, vars.render( locals[ name ] ) );
			}
		}
	}

	exit () {
		this._project.getVars().pop();
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

		if ( src.repo == dest.repo && src.branch == dest.branch ) {
			
			return true;
		}

		var submodules = this._submodules;
		for ( var i = 0, iend = submodules.length; i < iend; ++i ) {
			var submodule = submodules[ i ];
			submodule.enter();
			var ret = submodule.isUsingRepo( repo );
			submodule.exit();
			if ( ret === true ) {
				return true;
			}
		}
		return false;
	}

}

module.exports = Repo;