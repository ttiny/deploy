"use strict";

var Config = require( 'App/Config' );
var HttpApp = require( 'App/HttpApp' );
var DeployRequest = require( './DeployRequest' );
var Yaml = require( 'js-yaml' );
var YamlCmd = require( './yamltypes/Cmd' );
var Fs = require( 'fs' );
var Project = require( './Project' );
var VarStack = require( './VarStack' );

function Deploy () {
	HttpApp.call( this, DeployRequest, '0.0.0.0', 80 );

	// this.setConfig( new Config( { storage: { log: __dirname + '/log' } } ) );

	this._yaml = null;
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

	if ( !this.isValidAction( argv[ 0 ] ) ) {
		
		this.printUsage();
		this.close();
		return;
	}

	this.doAction( argv[ 0 ], argv[ 1 ], argv[ 2 ] )
	

}

Deploy.extend( HttpApp, {

	isValidAction: function ( name ) {
		name = name.toLowerCase().toFirstUpperCase();
		return Project.prototype[ name ] instanceof Function;
	},

	doSingleAction: function ( action, project, branch ) {
		project.enter( branch );
		project[ action ]();
		project.exit();
	},

	doAction: function ( action, project, branch ) {
		
		var _this = this;

		if ( project === '*' ) {
			this.updateKnownRepos( function ( repos ) {

				for ( var i = 0, iend = repos.length; i < iend; ++i ) {
					_this.doAction( action, 'repo:' + repos[ i ], branch );
				}

			} );
			return;
		}

		var projects = null;
		if ( project.startsWith( 'repo:' ) ) {
			projects = this.findProjectsByRepo( project.slice( 5 ) );
		}
		else {
			projects = this.findProjectsByName( project );
		}

		action = action.toLowerCase().toFirstUpperCase();

		for ( var i = 0, iend = projects.length; i < iend; ++i ) {
			var project = projects[ i ];

			if ( branch === '*' ) {
				project.getRepo().getBranches( function ( branches ) {
					_this.doSingleAction( action, project, branch );
				} );
			}
			else {
				this.doSingleAction( action, project, branch );
			}
		}
	},

	printUsage: function () {
		console.log( 'dpl <action[,action]..> <project> [branch]' );
		console.log( '\nActions:' );
		console.log( '\trun' );
		console.log( '\tstop' );
		console.log( '\tsync' );
		console.log( '\tbuild' );
		console.log( '\tpush' );
		console.log( '\tclean' );

	},

	reloadConfig: function () {
		this._vars = new VarStack;
		// this._repos = [];
		this._projects = {};
		this._templates = {};
		this._credentials = {};

		var configFn = __dirname + '/config/local.yml';
		var config = Fs.readFileSync( configFn, 'utf8' );
		this._yaml = Yaml.load( config, { filename: configFn, schema: Yaml.DEPLOY_SCHEMA } );

		// get top level vars
		var vars = this._yaml.vars;
		if ( vars instanceof Object ) {
			for ( var name in vars ) {
				this._vars.set( name, this._vars.render( vars[ name ] ) );
			}
		}

		// build projects list
		var projects = this._yaml.projects;
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
				this._projects[ name ] = new Project( this, project );
			}
		}

		var credentials = this._yaml.credentials;
		if ( credentials instanceof Object ) {
			for ( var host in credentials ) {
				var users = credentials[ host ];
				for ( var user in users ) {
					var name = host + '/' + user;
					var HostApi = require( './hosts/' + host.toFirstUpperCase() );
					this._credentials[ name ] = new HostApi( user, users[ user ]  );
				}
			}
		}
	},

	getHostApi: function ( repo ) {

		var repos = repo.split( '/' );
		var host = repos[ 0 ];
		var user = repos[ 1 ];
		
		var name = host + '/' + user;
		var ret = this._credentials[ name ];

		if ( ret === undefined ) {
			throw new Error( 'No credentials found for ' + repo + '.' )
		}

		return ret;
		
	},

	getVars: function () {
		return this._vars;
	},

	findProjectsByName: function ( name ) {
		var project = this._projects[ name ];
		if ( project ) {
			return [ project ];
		}
		return [];
	},

	findProjectsByRepo: function ( name ) {
		var projects = this._projects;
		var ret = [];
		for ( var name in projects ) {
			var project = projects[ name ];
			if ( project.isUsingRepo( name ) ) {
				ret.push( project );
			}
		}
		return ret;
	},

	getTemplate: function ( name ) {
		return this._templates[ name ];
	},

	updateKnownRepos: function ( callback ) {

		var _this = this;
		var hostsLeft = 0;
		var repos = [];
		
		function hostDone () {
			if ( --hostsLeft === 0 ) {
				if ( callback instanceof Function ) {
					_this._repos = repos;
				}
				callback( repos );
			}
		}

		// find list of repos
		
		var credentials = this._yaml.credentials;
		if ( credentials instanceof Object ) {
			for ( var host in credentials ) {
				++hostsLeft;
				// don't make 10000 requests while debuging
				var repos = require( './debug/' + host + '-repos' );
				hostDone();
				/*
				this.getHostApi().getRepos( function ( err, repos ) {
					if ( err !== null ) {
						repos = repos.concat( repos );
					}
					hostDone();
				} );
				//*/
			}
		}
	}

} );

new Deploy();