"use strict";

require( 'Prototype' );

var HttpApp = require( 'App/HttpApp' );
var DeployRequest = require( './DeployRequest' );
var Project = require( './Project' );
var VarStack = require( './VarStack' );
var Netmask = require( 'netmask' ).Netmask;
var Path = require( 'path' );
var Argv = require( 'App/Argv' )
var Util = require( 'util' );

require( './YamlHelpers' );
require( './LogHelpers' );

class Deploy extends HttpApp {
	
	constructor () {

		var argv = Argv.parse();

		var localConfigs = null;
		if ( argv && argv.config ) {
			localConfigs = argv.config;
		}
		else {
			localConfigs = __dirname + '/../config/local.yml';
		}

		if ( !(localConfigs instanceof Array) ) {
			localConfigs = [ localConfigs ];
		}

		var yaml = LoadYaml( __dirname + '/../config.yml' );
		for ( var i = 0, iend = localConfigs.length; i < iend; ++i ) {
			var localYaml = LoadYaml( localConfigs[ i ] );
			if ( localYaml instanceof Object ) {
				yaml.mergeDeep( localYaml );
			}
		}

		super( DeployRequest );
		this._yaml = yaml;
		
		if ( argv === null || argv[ 0 ] === undefined ) {
			this.doServer( yaml );
		}
		else {
			this.doCli( yaml );
		}

	}

	doServer ( yml ) {
		var khs = yaml( yml[ 'known-hosts' ], this._vars );
		this.KnownHosts = {};
		this.SecretAccess = yaml( yml[ 'secret-access' ], this._vars );
		if ( khs instanceof Object ) {
			for ( let host in khs ) {
				this.KnownHosts[ host ] = new Netmask( khs[ host ] );
			}
		}
		
		var http = yaml( yml.http, this._vars );
		var host = yaml( http.host, this._vars );
		var port = yaml( http.port, this._vars );
		console.log( 'Listening on', host + ':' + port + '...' );
		this.startListening( port, host );
	}
	
	doCli () {
		this._vars = null;
		this._projects = null;
		this._templates = null;
		this._credentials = null;
		this._branchesCache = {};
		this._list = { List: {}, Deps: {} };
		this._depsCtx = { '#stack': [] };
		this._depsCache = {};
		this._level = 0;
		
		this.loadConfig();

		process.exitCode = 1;
		var argv = this.getArgv();
		if ( !this.isValidArgv( argv ) ) {

		    this.printUsage();
			this.close();
			return;
		}

		var actions = argv[ 0 ].split( ',' );
		for ( var i = actions.length - 1; i >= 0; --i ) {
			if ( !this.isValidAction( actions[ i ] ) ) {
				this.printUsage();
				this.close();
				return;
			}
		}

		process.exitCode = 0;
		for ( var i = 0, iend = actions.length; i < iend; ++i ) {
			var project;
			var argc = 1;
			while ( project = argv[ argc++ ] ) {
				project = project.splitFirst( '#' );
				this.doAction( actions[ i ], project.left, project.right );
			}
		}
	}

	isValidArgv ( argv ) {
		if ( argv === null ) {
			return false;
		}
		var argc = 0;
		while ( String.isString( argv[ argc ] ) ) {
			++argc;
		}
		if ( argc < 2 ) {
			return false;
		}
		for ( var i = argc - 1; i >= 1; --i ) {
			if ( argv[ i ].indexOf( '#' ) < 0 ) {
				if ( argv[ i ].startsWith( 'repo:' ) ) {
					console.error( 'Branch is mandatory for commands by repo (' + argv[ i ] + ').' );
					return false;
				}
				argv[ i ] += '#**';
			}
		}
		return true;
	}

	isValidAction ( name ) {
		name = name.toLowerCase().toFirstUpperCase();
		return name == 'List' || Project.prototype[ name ] instanceof Function;
	}

	_isCached ( project, cmd ) {

		if ( this.getArgv()[ 'no-deps-cache' ] ) {
			return false;
		}

		var current = project.getName() + '#' + project.getCurrentBranch() + ' ' + cmd;
		if ( this._depsCache[ current ] ) {
			return true;
		}
		this._depsCache[ current ] = true;
		return false;
	}

	doSingleAction ( action, project, branch ) {

		project.enter( branch );
		if ( !project.isBranchAllowed( branch ) ) {
			project.exit();
			return;
		}

		if ( this._isCached( project, action ) ) {
			console.warn( 'Using', project.getName() + '#' + project.getCurrentBranch(), action, 'from cache.' );
			project.exit();
			return true;
		}
		
		if ( action == 'List' ) {
			if ( !project[ action ]( this._list ) ) {
				process.exitCode = 1;
			}
		}
		else {

			++this._level;
			console.infoGroup( ( this._level > 2 ? '#'.repeat( this._level ) + ' ' : '' ) + action + 'ing project', project.getName(), 'branch', branch, '...' );
			if ( this._level == 1 ) {
				console.infoGroup( '==========' );
			}
			else if ( this._level == 2 ) {
				console.infoGroup( '----------' );
			}

			if ( project[ action ]() ) {
				console.infoGroup( 'All good.\n' )
			}
			else {
				if ( this._level == 1 ) {
					console.error( 'Finished with errors.\n' )
				}
				process.exitCode = 1;
				//todo: mail someone
			}
		}

		--this._level;
		project.exit();
		return process.exitCode != 1;
	}

	doAction ( action, project, branch, callback ) {

		callback = callback || function () {};
		
		var _this = this;

		if ( project == '*' ) {
			handleProjects( null, this._projects, branch, '*' );
			return;
		}

		var projects = null;
		if ( project.startsWith( 'repo:' ) ) {

			var repo = project.slice( 5 );
			if ( project.indexOf( '#' ) < 0 ) {

				if ( branch == '*' ) {
					this.getHostApi( repo ).getBranches( repo.splitFirst( '/' ).right, function ( err, branches ) {
						if ( err ) {
							console.warn( 'Couldn\'t retrieve the list of branches for', repo + ', skipping.' );
							return;
						}

						function doOne ( i ) {
							if ( i >= branches.length ) {
								return;
							}

							_this.doAction( action, project, branches[ i ], () => {
								doOne( i + 1  );
							} );
						}

						doOne( 0 );

					} );
					return;
				}
				else if ( branch !== undefined ) {
					repo += '#' + branch;
				}

				branch = '*';
			}
			else {
				branch = '*';
			}
			this.findProjectsByRepo( repo, branch, handleProjects.bindArgsAfter( repo ) );
		}
		else {
			handleProjects( null, this.findProjectsByName( project ), project );
		}

		function handleProjects ( err, projects, name ) {
			
			var list = {};
			action = action.toLowerCase().toFirstUpperCase();

			if ( projects.length === 0 ) {
				console.warn( 'Couldn\'t find any projects matching', name + ', skipping.' );
				done();
				return;
			}

			projects = projects.unique();

			var projectsLeft = projects.length;
			var _branch = branch;

			for ( var i = 0, iend = projects.length; i < iend; ++i ) {
				let project = projects[ i ];
				let branch = _branch;
				if ( project instanceof Array ) {
					branch = project[ 1 ];
					project = project[ 0 ];
				}

				if ( branch == '*' ) {
					// this is async, but doSingleAction is sync so they won't be executed in parallel
					_this.getProjectBranches( project, function ( err, branches ) {
						if ( err ) {
							console.warn( 'Couldn\'t retrieve the list of branches for project', project.getName() + ', skipping.' );
							callback();
							return;
						}
						for ( var i = 0, iend = branches.length; i < iend; ++i ) {
							_this.doSingleAction( action, project, branches[ i ] );
						}
						if ( --projectsLeft == 0 ) {
							done();
						}
					} );
				}
				else if ( branch == '**' ) {
					let branch = _this.getOnlyBranch( project );
					if ( branch !== null ) {
						_this.doSingleAction( action, project, branch );
					}
					else {
						console.warn( 'Couldn\'t auto decide appropriate branch for project', project.getName() + ', skipping.' );
					}
					if ( --projectsLeft == 0 ) {
						done();
					}
				}
				else {
					_this.doSingleAction( action, project, branch );
					if ( --projectsLeft == 0 ) {
						done();
					}
				}
			}

			function done () {

				if ( action != 'List' ) {
					callback();
					return;
				}

				_this.printList();
				callback();
			}
		}

		
	}

	printUsage () {
		console.log( 'deploy <command[,command]..> <project[#branch]>.. [OPTIONS]..' );
	}

	getList () {
		return this._list;
	}

	getDepsCtx () {
		return this._depsCtx;
	}

	printList () {
		var list = this._list.List;
		var empty = true;
		for ( var name in list ) {
			var branches = list[ name ].sort();
			if ( empty ) {
				empty = false;
				console.infoGroup( 'Listing projects:' );
			}
			console.info( name + ':', branches.join( ', ' ) );
		}
		if ( empty ) {
			console.infoGroup( 'No matches found to list.' );
		}
		else {
			console.infoGroup( '^^^^^\n' );
		}

		if ( !this.getArgv().deps ) {
			return;
		}

		var list = this._list.Deps;
		var empty = Object.keys( list ).length == 0;
		if ( empty ) {
			console.infoGroup( 'No dependecies found to list.' );
		}
		else {

			function printOne ( item, level ) {
				if ( item instanceof Array ) {
					for ( var i of item ) {
						printOne( i, level );
					}
				}
				else if ( item instanceof Object ) {
					for ( var key in item ) {
						var sub = item[ key ];
						console.info( '  '.repeat( level ) + key + ':', String.isString( sub ) ? sub : '' );
						printOne( sub, level + 1 );
					}
				}
			}

			console.infoGroup( 'Listing dependecies:' );
			printOne( list, 0 );
			console.infoGroup( '^^^^^\n' );
		}		
	}

	normalizeProject ( prj ) {
		prj = yaml( prj, this._vars );
		if ( Object.isObject( prj ) && Object.keys( prj ).length == 1 ) {
			for ( var key in prj ) {
				var ret = prj[ key ];
				ret.name = key;
				return ret;
			}
		}
		return prj;
	}

	loadConfig () {
		this._vars = new VarStack( this );
		this._projects = [];
		this._templates = [];
		this._credentials = {};

		// get top level vars
		this._vars.set( 'deploy.root', Path.dirname( __dirname ) );
		var vars = this._yaml.vars;
		if ( vars instanceof Object ) {
			for ( var name in vars ) {
				this._vars.set( name, this._vars.render( vars[ name ] ) );
			}
		}
		var argv = this.getArgv();
		if ( argv.var ) {
			if ( String.isString( argv.var ) ) {
				argv.var = [ argv.var ];
			}
			if ( argv.var instanceof Array ) {
				for ( var i = argv.var.length - 1; i >= 0; --i ) {
					var v = argv.var[ i ].splitFirst( '=' );
					this._vars.set( v.left, v.right );
				}
			}
		}
		if ( this._vars.get( 'debug' ) ) {
			this._vars.print();
		}

		// build projects list
		var projects = yaml( this._yaml.projects, this._vars);
		
		if ( Object.isObject( projects ) ) {
			var tmp = [];
			for ( var name in projects ) {
				var project = yaml( projects[ name ], this._vars );
				project.name = name;
				tmp.push( project );
			}
			projects = tmp;
		}

		if ( projects instanceof Array ) {
			var prjs = [];
			// load the templates first cause the projects need them
			for ( var i = 0; i < projects.length; ++i ) {
				if ( projects[ i ] instanceof Array ) {
					Array.prototype.splice.apply( projects, [ i, 1 ].concat( projects[ i ] ) );
					--i;
				}
			}
			for ( var project of projects ) {
				project = this.normalizeProject( project );
				var isTemplate = yaml( project.template, this._vars );
				if ( isTemplate ) {
					delete project.template;
					this._templates.push( project );
				}
				else {
					prjs.push( project );
				}
			}
			// then load the projects
			for ( var project of prjs ) {
				this._projects.push( new Project( this, this._vars, project ) );
			}
		}

		var credentials = yaml( this._yaml.credentials, this._vars );
		if ( credentials instanceof Object ) {
			for ( var host in credentials ) {
				var users = yaml( credentials[ host ], this._vars );
				for ( var user in users ) {
					var name = host + '/' + user;
					var HostApi = require( './host/' + host.toFirstUpperCase() );
					this._credentials[ name ] = new HostApi( user, yaml( users[ user ], this._vars ) );
				}
			}
		}
	}

	getHostApi ( repo ) {

		var repos = repo.split( '/' );
		var host = repos[ 0 ];
		var user = repos[ 1 ];
		
		var name = host + '/' + user;
		var ret = this._credentials[ name ];

		if ( ret === undefined ) {
			console.warn( 'No credentials found for', repo, '. Assuming public repo.' )
			var HostApi = require( './host/' + host.toFirstUpperCase() )
			return new HostApi();
		}

		return ret;
	}

	//bp: this is not in the project because atm all .enter calls are outside Project/Repo/etc
	getOnlyBranch ( project ) {
		project.enter( '*' );
		var ret = null;
		var branches = project.getBranches(); 
		if ( branches.length == 1 ) {
			if ( String.isString( branches[ 0 ] ) && branches[ 0 ] != '*' ) {
				ret = branches[ 0 ];
			}
		}
		project.exit();
		return ret;
	}

	//bp: this is not in the project because atm all .enter calls are outside Project/Repo/etc
	getProjectBranches ( project, callback ) {

		var _callback = callback;
		var _this = this;
		callback = function ( err, branches ) {
			if ( !err ) {
				_this._branchesCache[ project.getName() ] = branches;
			}
			_callback( err, branches );
		};

		var cache = this._branchesCache[ project.getName() ];
		if ( cache !== undefined ) {
			callback( null, cache );
			return;
		}

		project.enter( '*' );

		// check if we are limited to static branch names or we have *
		var local = [];
		var branches = project.getBranches(); 
		for ( var i = branches.length - 1; i >= 0; --i ) {
			var branch = branches[ i ];
			if ( branch instanceof RegExp || branch == '*' ) {
				continue;
			}
			local.push( branch );
		}

		// if all enabled branches are already known don't request remotes
		if ( local.length < branches.length ) {
			var repo = project.getRepo();
			if ( repo ) {
				repo.enter();
				var remote = repo.getRemote();
				repo.exit();
				project.exit();
				// if we have hardcoded branch for the repo then use it
				if ( remote.indexOf( '#' ) > 0 ) {
					var branch = remote.splitFirst( '#' ).right;
					if ( branch != '*' ) {
						callback( null, [ branch ] );
						return;
					}
				}
				var hostApi = this.getHostApi( remote );
				if ( hostApi ) {
					hostApi.getBranches( remote.splitFirst( '/' ).right.splitFirst( '#' ).left, function ( err, branches ) {
						if ( err && local.length > 0 ) {
							console.warn( 'Couldn\'t retrieve the list branches for project', project.getName() + ', using only locally known ones.' );
							callback( null, local );
							return;
						}
						callback( err, branches );
					} );
					return;
				}
			}
		}

		project.exit();
		callback( null, local );
	}

	findProjectsByName ( name ) {
		var ret = [];
		for ( var project of this._projects ) {
			if ( project.getName() == name ) {
				ret.push( project );
			}
		}
		return ret;
	}

	findProjectsByRepo ( repo, branch, callback ) {
		var projects = this._projects;
		var ret = [];
		var projectsLeft = Object.keys( projects ).length;
		if ( branch == '*' ) {
			for ( let project of projects ) {
				this.getProjectBranches( project, function ( err, branches ) {
					if ( err ) {
						console.warn( 'Couldn\'t retrieve the list of branches for project', project.getName() + ', skipping.' );
					}
					else {
						for ( var i = 0, iend = branches.length; i < iend; ++i ) {
							project.enter( branches[ i ] );
							if ( project.isUsingRepo( repo ) ) {
								ret.push( [ project, branches[ i ] ] );
							}
							project.exit();
						}
					}
					if ( --projectsLeft === 0 ) {
						done( err );
					}
				} );
			}
			return;
		}
		else {
			for ( var project of projects ) {
				project.enter( branch );
				if ( project.isUsingRepo( repo ) ) {
					ret.push( [ project, brach ] );
				}
				project.exit();
			}
		}

		function done ( err ) {
			callback( err, Object.values( ret ) );
		}

		done( null );
	}

	getTemplate ( name ) {
		for ( var template of this._templates ) {
			if ( template.name == name ) {
				return template;
			}
		}
	}

}

module.exports = Deploy;