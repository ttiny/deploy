"use strict";

var RockerCompose = require( './RockerCompose' );
var Rocker = require( './Rocker' );
var Repo = require( './Repo' );

class Project {

	constructor ( app, vars, data ) {

		this._app = app;
		this._vars = vars;

		while ( yaml( data.extends, vars ) ) {
			var tmpl = app.getTemplate( data.extends );
			if ( tmpl === undefined ) {
				throw new Error( 'Template ' + data.extends + ' is not defined.' );
			}
			delete data.extends;
			data = tmpl.duplicate().mergeDeep( data );
		}
		this._data = data;
		this._name = data.name;
		this._repo = null;
		this._image = null;
		this._pod = null;
		this._branches = null;
		this._labels = null;

	}

	Sync () {
		if ( this._repo === null ) {
			throw new Error( 'Can not sync a project (' + this._name + ') without git "repo" configuration.' );
		}
		var repos = this._repo;
		for ( var i = 0, iend = repos.length; i < iend; ++i ) {
			var repo = repos[ i ];
			repo.enter();
			var ret = repo.Sync();
			repo.exit();
			if ( !ret ) {
				return ret;
			}
		}
		return ret;
	}

	Clean () {

		var argv = this._app.getArgv();

		if ( argv.force !== true && this.isCleanProtected() ) {
			console.log( 'Skipping protected project', this._name, '.' );
			return true;
		}

		if ( this._pod ) {
			this._pod.enter();
			var ret = this._pod.Clean();
			this._pod.exit();
		}
		if ( this._repo ) {
			var repos = this._repo;
			for ( var i = repos.length - 1; i >= 0; --i ) {
				var repo = repos[ i ];
				repo.enter();
				var ret = repo.Clean();
				repo.exit();
				if ( !ret ) {
					return ret;
				}
			}
		}
		if ( argv.rmi ) {
			this.Rmi();
		}
		return ret;
	}

	Rmi () {

		var argv = this._app.getArgv();

		if ( argv.force !== true && this.isRmiProtected() ) {
			console.log( 'Skipping protected project', this._name, '.' );
			return true;
		}

		if ( this._image === null ) {
			throw new Error( 'Can not remove images for a project (' + this._name + ') without "image" configuration.' );
		}

		var ret = false;
		var rockers = this._image;
		for ( var i = 0, iend = rockers.length; i < iend; ++i ) {
			var rocker = rockers[ i ];
			rocker.enter();
			ret = rocker.Clean();
			rocker.exit();
			if ( !ret ) {
				return ret;
			}
		}
		return ret;
	}

	Build () {
		if ( this._image === null ) {
			throw new Error( 'Can not build a project (' + this._name + ') without "image" configuration.' );
		}
		var ret = false;
		var rockers = this._image;
		for ( var i = 0, iend = rockers.length; i < iend; ++i ) {
			var rocker = rockers[ i ];
			rocker.enter();
			ret = rocker.Build();
			rocker.exit();
			if ( !ret ) {
				return ret;
			}
		}
		return ret;
	}

	Push () {
		if ( this._image === null ) {
			throw new Error( 'Can not push a project (' + this._name + ') without "image" configuration.' );
		}
		var ret = false;
		var rockers = this._image;
		for ( var i = 0, iend = rockers.length; i < iend; ++i ) {
			var rocker = rockers[ i ];
			rocker.enter();
			ret = rocker.Push();
			rocker.exit();
			if ( !ret ) {
				return ret;
			}
		}
		return ret;
	}

	Run () {
		if ( this._pod === null ) {
			throw new Error( 'Can not run a project (' + this._name + ') without "pod" configuration.' );
		}
		this._pod.enter();
		var ret = this._pod.Run();
		this._pod.exit();
		return ret;
	}

	Stop () {
		if ( this._pod === null ) {
			throw new Error( 'Can not stop a project (' + this._name + ') without "pod" configuration.' );
		}
		this._pod.enter();
		var ret = this._pod.Stop();
		this._pod.exit();
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
		if ( vars.get( 'project.debug' ) ) {
			vars.print();
		}

		
		this._branches = [];
		var branches = yaml( this._data.branches, vars );
		if ( branches instanceof Array ) {
			for ( var i = 0, iend = branches.length; i < iend; ++i ) {
				var branch = vars.render( yaml( branches[ i ], vars ) );
				if ( Number.isNumber( branch ) ) {
					branch = branch.toString();
				}
				this._branches.push( branch );
			}
		}
		else if ( branches !== undefined ) {
			var branch = vars.render( branches );
			if ( Number.isNumber( branch ) ) {
				branch = branch.toString();
			}
			this._branches.push( branch );
		}
		else {
			this._branches.push( '*' );
		}

		if ( this._data.labels !== undefined ) {
			this._labels = vars.render( yaml( this._data.labels, vars ) );
		}


		if ( this._data.repo ) {
			var repo = yaml( this._data.repo, vars );
			this._repo = [];
			for ( var remote in repo ) {
				this._repo.push( new Repo( this, remote, repo[ remote ] ) );
			}
		}

		if ( this._data.image ) {
			var rocker = yaml( this._data.image, vars );
			if ( rocker instanceof Array ) {
				this._image = [];
				for ( var i = 0, iend = rocker.length; i < iend; ++i ) {
					this._image.push( new Rocker( this, yaml( rocker[ i ], vars ) ) );
				}
			}
			else {
				this._image = [ new Rocker( this, rocker ) ];
			}
		}
		
		if ( this._data.pod ) {
			this._pod = new RockerCompose( this, yaml( this._data.pod, vars ) );
		}
	}

	exit () {
		this._vars.pop();
	}

	isRmiProtected () {
		return String.isString( this._labels ) && this._labels.match( /(?:^| )dont-rmi(?:$| )/ ) !== null;
	}

	isCleanProtected () {
		return String.isString( this._labels ) && this._labels.match( /(?:^| )dont-clean(?:$| )/ ) !== null;
	}

	isBranchAllowed ( branch ) {
		var branch = this._vars.get( 'branch' );
		var branches = this._branches;
		for ( var i = 0, iend = branches.length; i < iend; ++i ) {
			var branch2 = branches[ i ];
			if ( String.isString( branch2 ) && (branch == branch2 || branch2 == '*') ) {
				return true;
			}
			else if ( branch2 instanceof RegExp && branch.match( branch2 ) ) {
				return true;
			}
		}

		return false;
	}

	getBranches () {
		return yaml( this._branches, this._vars );
	}

	isUsingRepo ( repo ) {
		if ( this._repo === null ) {
			return false;
		}
		var repos = this._repo;
		for ( var i = 0, iend = repos.length; i < iend; ++i ) {
			var repoo = repos[ i ];
			repoo.enter();
			var ret = repoo.isUsingRepo( repo );
			repoo.exit();
			if ( ret ) {
				return ret;
			}
		}
		return false;
	}

	getRepo () {
		return this._repo ? this._repo[ 0 ] : null;
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