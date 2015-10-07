"use strict";

var HttpAppRequest = require( 'App/HttpAppRequest' );
var ChildProcess = require( 'child_process' );
var Url = require( 'url' );
var Ansi = require( 'ansi-html-stream' );

var _id = 0;
var HtmlHeader = '<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body style="font-family: monospace; white-space: pre; background-color: #171717; color: #A6E22E; margin: 5px;">';
var HtmlFooter = '</body></html>';

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
		this._id = ++_id;
		var argv = app.getArgv();

		if ( argv === null ) {
			return;
		}

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

	}

	onHttpContent ( content ) {

		this._response.statusCode = 404;
		this._response.setHeader( 'content-type', 'text/plain' );
		this._response.setHeader( 'connection', 'close' );

		console.log( '(' + this._id + ')', 'Incoming request', this._request.connection.remoteAddress, new Date().toISOString() + ( this._secret ? '(' + this._secret + ')' : '' ) + '.' );
		
		var host = this.isKnownIp();
		if ( host === false && !this.knowsTheSecret() ) {
			console.warn( '(' + this._id + ')', 'Denied', this._request.url + '.' );
			this._response.end();
			return;
		}

		var req = {};
		if ( host ) {
			try {
				var HostApi = require( './host/' + host.toFirstUpperCase() );
				req = HostApi.parsePayload( this._request.headers, content );
			}
			catch ( e ) {}
		}
		
		if ( req === null ) {
			req = { error: true };
		}
		else {
			console.info( '(' + this._id + ')', 'Identified as', host ? host + ' payload.' : 'REST request.' )
		}

		if ( req.target == 'tag' ) {
			console.log( '(' + this._id + ')', 'Ignoring tag event.' )
			this._response.statusCode = 200;
			this._response.end( 'Not handling tag events.' );
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
			this._response.statusCode = 500;
			if ( req.error ) {
				console.error( '(' + this._id + ')', 'Unable to handle payload.' )
				this._response.end( 'Unable to handle the event payload.' );
				return;
			}
			console.error( '(' + this._id + ')', 'Incomplete request.' )
			this._response.end( 'Incomplete request.' );
			return;
		}

		this._response.statusCode = 200;

		var args = [ process.argv[ 1 ], req.action, req.repo + '#' + req.branch ].concat( this._flags ).concat( this._appArgv );
		var options = { stdio: 'pipe' };
		console.log( '(' + this._id + ')', 'Spawning deploy', args.slice( 1 ).join( ' ' ) );
		var child = ChildProcess.spawn( process.argv[ 0 ], args, options );

		var accept = this._request.headers[ 'accept' ];
		var isHtml = false;
		if ( String.isString( accept ) ) {
			var accept = accept.split( ',' );
			if ( accept.indexOf( 'text/tty' ) >= 0 ) {
				child.stdout.pipe( this._response );
				child.stderr.pipe( this._response );
			}
			else {
				var ansiStreamOptions = { strip: true };
				if ( accept.indexOf( 'text/html' ) >= 0 ) {
					isHtml = true;
					ansiStreamOptions.strip = false;
					this._response.setHeader( 'content-type', 'text/html' );
					this._response.write( HtmlHeader );
				}
				
				var ansiStream = Ansi( ansiStreamOptions );
				child.stdout.pipe( ansiStream );
				child.stderr.pipe( ansiStream );
				ansiStream.pipe( this._response, { end: false } );
			}
		}


		var _this = this;
		child.on( 'error', function () {
			_this._response.statusCode = 500;
			if ( !isHtml ) {
				_this._response.end();
			}
			else {
				_this._response.end( HtmlFooter );
			}
			console.error( '(' + _this._id + ')', 'Finished with errors.' )
		} );

		child.on( 'exit', function ( code, signal ) {
			_this._response.statusCode = code !== 0 ? 500 : 200;
			if ( !isHtml ) {
				_this._response.end();
			}
			else {
				_this._response.end( HtmlFooter );
			}
			( code === 0 ? console.log : console.error )( '(' + _this._id + ')', code === 0 ? 'All good.' : 'Finished with errors.' )
		} );


	}

	isKnownIp () {
		var knownHosts = this._app.KnownHosts;
		for ( var host in knownHosts ) {
			if ( knownHosts[ host ].contains( this._request.connection.remoteAddress ) ) {
				return host;
			}
		}

		return false;
	}

	knowsTheSecret () {
		return this._app.SecretAccess == ''
		|| (
			String.isString( this._app.SecretAccess ) &&
			this._app.SecretAccess.length > 0 &&
			this._secret == this._app.SecretAccess
		)
		|| (
			this._app.SecretAccess instanceof Array &&
			this._app.SecretAccess.indexOf( this._secret ) >= 0
		);
	}

}

module.exports = DeployRequest;