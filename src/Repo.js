"use strict";

var Submodule = require( './Submodule' );
var Git = require( './Git' );

class Repo {
	
	constructor ( project, data ) {
		this._project = project;
		this._data = data;
		this._remote = null;
		this._local = null;
		this._submodules = null;
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

		var locals = yaml( this._data.vars, vars );
		if ( locals instanceof Object ) {
			for ( var name in locals ) {
				vars.set( 'repo.' + name, vars.render( yaml( locals[ name ], vars ) ) );
			}
		}
		
		this._remote = vars.render( yaml( this._data.remote, vars ) );
		this._local = vars.render( yaml( this._data.local, vars ) );
		
		this._submodules = [];

		var submodules = yaml( this._data.submodules, vars );
		if ( submodules instanceof Object ) {
			for ( var remote in submodules ) {
				this._submodules.push( new Submodule(
					this,
					{ remote: remote, local: yaml( submodules[ remote ], yaml ) }
				) );
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

		if ( src.repo == dest.repo ) {

			if ( src.branch === null ) {
				src.branch = this._project.getVars().get( 'branch' );
			}

			if ( src.branch == dest.branch ) {
				return true;
			}
			
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