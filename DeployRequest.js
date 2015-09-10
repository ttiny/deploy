"use strict";

var HttpAppRequest = require( 'App/HttpAppRequest' );
var ChildProcess = require( 'child_process' );

class DeployRequest extends HttpAppRequest {

	constructor ( app, req, res ) {
		super( app, req, res );
		this._argv = req.url.split( '/' );
		if ( this._argv[ 0 ] == '' ) {
			this._argv.shift();
		}
	}

	onHttpContent ( content ) {

		this.Response.statusCode = 404;
		this.Response.setHeader( 'content-type', 'text/plain' );
		this.Response.setHeader( 'connection', 'close' );
		
		var host = this.isKnownIp();
		if ( host === false && !this.knowsTheSecret() ) {
			this.Response.end();
			return;
		}

		if ( String.isString( this.App.SecretAccess ) && this.App.SecretAccess.length > 0 ) {
			this._argv.shift();
		}

		var req = {};
		if ( host ) {
			try {
				var HostApi = require( './host/' + host.toFirstUpperCase() );
				req = HostApi.parseRequest( this.Request.headers, content );
			}
			catch ( e ) {}
		}
		
		if ( req === null ) {
			req = { error: true };
		}

		if ( req.target == 'tag' ) {
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
				this.Response.end( 'Unable to handle the event payload.' );
				return;
			}
			this.Response.end( 'Incomplete request.' );
			return;
		}

		this.Response.statusCode = 200;
		var args = [ process.argv[ 1 ], req.action, req.repo, req.branch ];
		var options = { stdio: 'pipe' };
		var child = ChildProcess.spawn( process.argv[ 0 ], args, options );

		child.stdout.pipe( this.Response );
		child.stderr.pipe( this.Response );

		var _this = this;
		child.on( 'error', function () {
			_this.Response.statusCode = 500;
			_this.Response.end();
		} );

		child.on( 'exit', function () {
			_this.Response.end();
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
			this._argv[ 0 ] == this.App.SecretAccess
		);
	}

}

module.exports = DeployRequest;