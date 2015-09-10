"use strict";

var Config = require( 'App/Config' );
var HttpApp = require( 'App/HttpApp' );
var DeployRequest = require( './DeployRequest' );
var Yaml = require( 'js-yaml' );
var YamlCmd = require( './yamltypes/Cmd' );
var Fs = require( 'fs' );
var Project = require( './Project' );
var VarStack = require( './VarStack' );

class Deploy extends HttpApp {
	
	constructor () {

		super( DeployRequest, '0.0.0.0', 80 );

		// this.setConfig( new Config( { storage: { log: __dirname + '/log' } } ) );

		this._vars = null;
		// this._repos = null;
		this._projects = null;
		this._templates = null;
		this._credentials = null;

		Yaml.DEPLOY_SCHEMA = Yaml.Schema.create( Yaml.DEFAULT_FULL_SCHEMA, [ YamlCmd ] );
		
		this.reloadConfig();

		var argv = this.getArgv();

		if ( argv === null ||
		    !String.isString( argv[ 0 ] ) ||
		    !String.isString( argv[ 1 ] ) ||
		    !String.isString( argv[ 2 ] ) ) {

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

		for ( var i = 0, iend = actions.length; i < iend; ++i ) {
			this.doAction( actions[ i ], argv[ 1 ], argv[ 2 ] );
		}
	}
	

	isValidAction ( name ) {
		name = name.toLowerCase().toFirstUpperCase();
		return Project.prototype[ name ] instanceof Function;
	}

	doSingleAction ( action, project, branch ) {
		project.enter( branch );
		console.log( action + 'ing project', project.getName(), 'branch', branch, '...' );
		console.log( '==========' );
		if ( project[ action ]( this.getArgv() ) ) {
			console.log( 'All good.' )
		}
		else {
			//todo: mail someone
		}
		console.log( '\n\n' );
		project.exit();
	}

	doAction ( action, project, branch ) {
		
		var _this = this;

		if ( project == '*' ) {
			this.updateKnownRepos( function ( repos ) {
				
				for ( var i = 0, iend = repos.length; i < iend; ++i ) {
					_this.doAction( action, 'repo:' + repos[ i ], branch );
				}

			} );
			return;
		}

		var projects = null;
		if ( project.startsWith( 'repo:' ) ) {

			var repo = project.slice( 5 );
			if ( project.indexOf( '#' ) < 0 ) {

				if ( branch == '*' ) {
					this.getHostApi( repo ).getBranches( repo.splitFirst( '/' ).right, function ( err, branches ) {
						if ( err ) {
							console.error( 'Couldn\'t retrieve the list of branches for', repo, ', skipping.' );
							return;
						}
						for ( var i = 0, iend = branches.length; i < iend; ++i ) {
							_this.doAction( action, project, branches[ i ] );
						}
					} );
					return;
				}

				repo += '#' + branch;
				branch = '*';
			}
			else {
				branch = '*';
			}

			this.findProjectsByRepo( repo, branch, handleProjects );
		}
		else {
			handleProjects( null, this.findProjectsByName( project ) );
		}

		function handleProjects ( err, projects ) {
			action = action.toLowerCase().toFirstUpperCase();

			for ( var i = 0, iend = projects.length; i < iend; ++i ) {
				var project = projects[ i ];

				if ( branch == '*' ) {
					_this.getProjectBranches( project, function ( err, branches ) {
						if ( err ) {
							console.error( 'Couldn\'t retrieve the list of branches for', remote, ', skipping.' );
							return;
						}
						for ( var i = 0, iend = branches.length; i < iend; ++i ) {
							_this.doSingleAction( action, project, branches[ i ] );
						}
					} );
				}
				else {
					_this.doSingleAction( action, project, branch );
				}
			}	
		}

		
	}

	printUsage () {
		console.log( 'dpl <action[,action]..> <project> <branch>' );
	}

	reloadConfig () {
		this._vars = new VarStack;
		// this._repos = [];
		this._projects = {};
		this._templates = {};
		this._credentials = {};

		var configFn = __dirname + '/config/local.yml';
		var config = Fs.readFileSync( configFn, 'utf8' );
		var yaml = Yaml.load( config, { filename: configFn, schema: Yaml.DEPLOY_SCHEMA } );

		// get top level vars
		var vars = yaml.vars;
		if ( vars instanceof Object ) {
			for ( var name in vars ) {
				this._vars.set( name, this._vars.render( vars[ name ] ) );
			}
		}

		// build projects list
		var projects = yaml.projects;
		if ( projects instanceof Object ) {

			// load the templates
			for ( var name in projects ) {
				var project = projects[ name ];
				if ( project.template ) {
					this._templates[ name ] = project;
					delete project.template;
					delete projects[ name ];
				}
			}

			// load the projects
			for ( var name in projects ) {
				var project = projects[ name ];
				project.name = name;
				this._projects[ name ] = new Project( this, this._vars, project );
			}
		}

		var credentials = yaml.credentials;
		if ( credentials instanceof Object ) {
			for ( var host in credentials ) {
				var users = credentials[ host ];
				for ( var user in users ) {
					var name = host + '/' + user;
					var HostApi = require( './host/' + host.toFirstUpperCase() );
					this._credentials[ name ] = new HostApi( user, users[ user ]  );
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
			console.log( 'No credentials found for', repo, '. Assuming public repo.' )
			var HostApi = require( './host/' + host.toFirstUpperCase() )
			return new HostApi();
		}

		return ret;
		
	}

	getProjectBranches ( project, callback ) {
		project.enter( '*' );
		var repo = project.getRepo();
		repo.enter();
		var remote = repo.getRemote();
		repo.exit();
		project.exit();
		this.getHostApi( remote ).getBranches( remote.splitFirst( '/' ).right, callback );
	}

	findProjectsByName ( name ) {
		var project = this._projects[ name ];
		if ( project ) {
			return [ project ];
		}
		return [];
	}

	findProjectsByRepo ( repo, branch, callback ) {
		var projects = this._projects;
		var ret = {};
		var projectsLeft = Object.keys( projects ).length;
		for ( var name in projects ) {
			let project = projects[ name ];
			if ( branch == '*' ) {
				this.getProjectBranches( project, function ( err, branches ) {
					if ( err ) {
						console.error( 'Couldn\'t retrieve the list of branches for', repo, ', skipping.' );
					}
					else {
						for ( var i = 0, iend = branches.length; i < iend; ++i ) {
							project.enter( branches[ i ] );
							if ( project.isUsingRepo( repo ) ) {
								ret[ project.getName() ] = project;
							}
							project.exit();
						}
					}
					if ( --projectsLeft === 0 ) {
						done( err );
					}
				} );
				
			}
			else {
				project.enter( branch );
				if ( project.isUsingRepo( repo ) ) {
					ret[ project.getName() ] = project;
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
		return this._templates[ name ];
	}

	updateKnownRepos ( callback ) {

		var _this = this;
		var remotesLeft = 0;
		var allrepos = [];
		
		function remoteDone () {
			if ( --remotesLeft === 0 ) {
				callback( allrepos );
			}
		}

		// find list of repos
		
		var credentials = this._credentials;
		for ( var remote in credentials ) {
			++remotesLeft;
			
			// don't make 10000 requests while debuging
			allrepos = require( './debug/' + remote.replace( '/', '-' ) + '-repos' );
			remoteDone();
			continue;
			///
			
			let host = remote.splitFirst( '/' );
			this.getHostApi( remote ).getRepos( function ( err, repos ) {
				if ( err === null ) {
					for ( var i = repos.length - 1; i >= 0; --i ) {
						repos[ i ] = host.left + '/' + repos[ i ];
					}
					allrepos = allrepos.concat( repos );
				}
				remoteDone();
			} );
		}
	}

}

new Deploy();