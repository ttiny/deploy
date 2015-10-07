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
		this._events = null;

	}

	notify ( event ) {
		var events = this._events[ event ];
		if ( events === undefined ) {
			return;
		}

		var vars = this._vars;

		for ( var i = 0, iend = events.length; i < iend; ++i ) {
			console.cliOutput( vars.render( yaml( events[ i ], vars ) ) );
		}
	}

	Sync () {
		if ( this._repo === null ) {
			console.warn( 'Can not sync a project (' + this._name + ') without git "repo" configuration. Skipping.' );
			return true;
		}

		var argv = this._app.getArgv();
		var vars = this._vars;
		var filter = argv.hasOwnProperty( 'filter' ) ? vars.render( argv.filter ) : null;

		this.notify( 'sync.start' );
		var ret = true;
		var repos = this._repo;
		for ( var i = 0, iend = repos.length; ret && i < iend; ++i ) {
			var repo = repos[ i ];
			repo.enter();
			if ( !filter || repo.filter( filter ) ) {
				ret = repo.Sync();
			}
			repo.exit();
		}
		this.notify( ret ? 'sync.success' : 'sync.error' );
		this.notify( 'sync.finish' );
		return ret;
	}

	Clean () {

		var argv = this._app.getArgv();

		if ( argv.force !== true && this.isCleanProtected() ) {
			console.warn( 'Skipping protected project', this._name + '.' );
			return true;
		}


		this.notify( 'clean.start' );
		var ret = true;
		if ( this._pod ) {
			this._pod.enter();
			var ret = this._pod.Clean();
			this._pod.exit();
		}
		if ( this._repo ) {
			var vars = this._vars;
			var filter = argv.hasOwnProperty( 'filter' ) ? vars.render( argv.filter ) : null;
			var repos = this._repo;
			for ( var i = repos.length - 1; ret && i >= 0; --i ) {
				var repo = repos[ i ];
				repo.enter();
				if ( !filter || repo.filter( filter ) ) {
					ret = repo.Clean();
				}
				repo.exit();
			}
		}
		this.notify( ret ? 'clean.success' : 'clean.error' );
		this.notify( 'clean.finish' );
		return ret;
	}

	Rmi () {

		var argv = this._app.getArgv();

		if ( argv.force !== true && this.isRmiProtected() ) {
			console.warn( 'Skipping protected project', this._name + '.' );
			return true;
		}

		if ( this._image === null ) {
			console.warn( 'Can not remove images for a project (' + this._name + ') without "image" configuration. Skipping.' );
			return true;
		}

		var vars = this._vars;
		var filter = argv.hasOwnProperty( 'filter' ) ? vars.render( argv.filter ) : null;

		this.notify( 'rmi.start' );
		var ret = true;
		var images = this._image;
		for ( var i = 0, iend = images.length; ret && i < iend; ++i ) {
			var image = images[ i ];
			image.enter();
			if ( !filter || image.filter( filter ) ) {
				ret = image.Clean();
			}
			image.exit();
		}
		this.notify( ret ? 'rmi.success' : 'rmi.error' );
		this.notify( 'rmi.finish' );
		return ret;
	}

	Build () {
		if ( this._image === null ) {
			console.warn( 'Can not build a project (' + this._name + ') without "image" configuration. Skipping.' );
			return true;
		}

		var argv = this._app.getArgv();
		var vars = this._vars;
		var filter = argv.hasOwnProperty( 'filter' ) ? vars.render( argv.filter ) : null;

		this.notify( 'build.start' );
		var ret = true;
		var images = this._image;
		for ( var i = 0, iend = images.length; ret && i < iend; ++i ) {
			var image = images[ i ];
			image.enter();
			if ( !filter || image.filter( filter ) ) {
				ret = image.Build();
			}
			image.exit();
		}
		this.notify( ret ? 'build.success' : 'build.error' );
		this.notify( 'build.finish' );
		return ret;
	}

	Push () {
		if ( this._image === null ) {
			console.warn( 'Can not push a project (' + this._name + ') without "image" configuration. Skipping.' );
			return true;
		}

		var argv = this._app.getArgv();
		var vars = this._vars;
		var filter = argv.hasOwnProperty( 'filter' ) ? vars.render( argv.filter ) : null;

		this.notify( 'push.start' );

		var ret = true;
		var images = this._image;
		for ( var i = 0, iend = images.length; ret && i < iend; ++i ) {
			var image = images[ i ];
			image.enter();
			if ( !filter || image.filter( filter ) ) {
				ret = image.Push();
			}
			image.exit();
		}
		this.notify( ret ? 'push.success' : 'push.error' );
		this.notify( 'push.finish' );
		return ret;
	}

	Run () {
		if ( this._pod === null ) {
			console.warn( 'Can not run a project (' + this._name + ') without "pod" configuration. Skipping.' );
			return true;
		}
		this.notify( 'run.start' );
		this._pod.enter();
		var ret = this._pod.Run();
		this._pod.exit();
		this.notify( ret ? 'run.success' : 'run.error' );
		this.notify( 'run.finish' );
		return ret;
	}

	Stop () {
		if ( this._pod === null ) {
			console.warn( 'Can not stop a project (' + this._name + ') without "pod" configuration. Skipping.' );
			return true;
		}
		this.notify( 'stop.start' );
		this._pod.enter();
		var ret = this._pod.Stop();
		this._pod.exit();
		this.notify( ret ? 'stop.success' : 'stop.error' );
		this.notify( 'stop.finish' );
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
			var image = yaml( this._data.image, vars );
			if ( image instanceof Array ) {
				this._image = [];
				for ( var i = 0, iend = image.length; i < iend; ++i ) {
					this._image.push( new Rocker( this, yaml( image[ i ], vars ) ) );
				}
			}
			else {
				this._image = [ new Rocker( this, image ) ];
			}
		}
		
		if ( this._data.pod ) {
			this._pod = new RockerCompose( this, yaml( this._data.pod, vars ) );
		}

		this._events = {};
		if ( this._data.events ) {
			var events = yaml( this._data.events, vars );
			for ( var key in events ) {
				if ( this._events[ key ] === undefined ) {
					this._events[ key ] = [];
				}
				var event = events[ key ];
				if ( !(event instanceof Array) ) {
					event = [ event ];
				}
				this._events[ key ] = this._events[ key ].concat( event );
			}
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