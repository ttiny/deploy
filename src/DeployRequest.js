"use strict";

var HttpAppRequest = require( 'App/HttpAppRequest' );
var ChildProcess = require( 'child_process' );
var Url = require( 'url' );

var _id = 0;

class DeployRequest extends HttpAppRequest {

	constructor ( app, req, res ) {
		super( app, req, res );
		var url = Url.parse( req.url, true );
		this._argv = url.pathname.split( '/' );
		this._secret = null;
		this._flags = [];
		if ( url.query ) {
			this._secret = url.query.secret;
			delete url.query.secret;
			for ( var flag in url.query ) {
				var value = url.query[ flag ];
				this._flags.push( '-' + flag + ( ( String.isString( value ) && value.length > 0 ) ? '=' + value : '' ) );
			}
		}
		if ( this._argv[ 0 ] == '' ) {
			this._argv.shift();
		}

		// get the original startup params to pass to the spawned processes
		this._appArgv = [];
		var argv = app.getArgv();
		var argc = 0;
		while ( argv[ argc ] !== undefined ) {
			delete argv[ argc ];
		}
		for ( var key in argv ) {
			var arg = argv[ key ];
			if ( String.isString( arg ) ) {
				this._appArgv.push( '--' + key, arg );
			}
			else if ( arg instanceof Array ) {
				for ( var i = 0, iend = arg.length; i < iend; ++i ) {
					this._appArgv.push( '--' + key, arg[ i ] );
				}
			}
		}

		this._id = ++_id;
	}

	onHttpContent ( content ) {

		this.Response.statusCode = 404;
		this.Response.setHeader( 'content-type', 'text/plain' );
		this.Response.setHeader( 'connection', 'close' );

		console.log( '(' + this._id + ')', 'Incoming request', this.Request.connection.remoteAddress, new Date().toISOString(), '.' );
		
		var host = this.isKnownIp();
		if ( host === false && !this.knowsTheSecret() ) {
			console.log( '(' + this._id + ')', 'Denied', this.Request.url, '.' );
			this.Response.end();
			return;
		}

		var req = {};
		if ( host ) {
			try {
				var HostApi = require( './host/' + host.toFirstUpperCase() );
				req = HostApi.parsePayload( this.Request.headers, content );
			}
			catch ( e ) {}
		}
		
		if ( req === null ) {
			req = { error: true };
		}
		else {
			console.log( '(' + this._id + ')', 'Identified as', host ? host + ' payload.' : 'REST request.' )
		}

		if ( req.target == 'tag' ) {
			console.log( '(' + this._id + ')', 'Ignoring tag event.' )
			this.Response.statusCode = 200;
			this.Response.end( 'Not handling tag events.' );
			return;
		}

		if ( this._argv[ 0 ] && (
				this._argv[ 0 ] != 'deploy' || 
				!String.isString( req.action ) )
		) {

			req.action = this._argv[ 0 ];
		}
		
		if ( this._argv[ 1 ] ) {
			req.repo = this._argv[ 1 ];
		}

		if ( this._argv[ 2 ] ) {
			req.branch = this._argv[ 2 ];
		}

		if ( !req.action || !req.action == 'deploy' || !req.repo || !req.branch ) {
			this.Response.statusCode = 500;
			if ( req.error ) {
				console.log( '(' + this._id + ')', 'Unable to handle payload.' )
				this.Response.end( 'Unable to handle the event payload.' );
				return;
			}
			console.log( '(' + this._id + ')', 'Incomplete request.' )
			this.Response.end( 'Incomplete request.' );
			return;
		}

		this.Response.statusCode = 200;

		var args = [ process.argv[ 1 ], req.action, req.repo, req.branch ].concat( this._flags ).concat( this._appArgv );
		var options = { stdio: 'pipe' };
		console.log( '(' + this._id + ')', 'Spawning deploy', args.slice( 1 ).join( ' ' ) );
		var child = ChildProcess.spawn( process.argv[ 0 ], args, options );

		child.stdout.pipe( this.Response );
		child.stderr.pipe( this.Response );

		var _this = this;
		child.on( 'error', function () {
			_this.Response.statusCode = 500;
			_this.Response.end();
			console.log( '(' + _this._id + ')', 'Finished with errors.' )
		} );

		child.on( 'exit', function ( code, signal ) {
			_this.Response.statusCode = code !== 0 ? 500 : 200;
			_this.Response.end();
			console.log( '(' + _this._id + ')', code === 0 ? 'All good.' : 'Finished with errors.' )
		} );


	}

	isKnownIp () {
		var knownHosts = this.App.KnownHosts;
		for ( var host in knownHosts ) {
			if ( knownHosts[ host ].contains( this.Request.connection.remoteAddress ) ) {
				return host;
			}
		}

		return false;
	}

	knowsTheSecret () {
		return this.App.SecretAccess == '' || (
			String.isString( this.App.SecretAccess ) &&
			this.App.SecretAccess.length > 0 &&
			this._secret == this.App.SecretAccess
		);
	}

}

module.exports = DeployRequest;