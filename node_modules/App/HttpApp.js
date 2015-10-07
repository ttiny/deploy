"use strict";

var App = require( './App' );
var HttpAppRequest = require( './HttpAppRequest' );
var RequestRouter = require( './RequestRouter' );
var Http = require( 'http' );

class HttpApp extends App {

	constructor ( appRequestClass ) {

		super();
		
		this._appRequestClass = appRequestClass;
		this._server = Http.createServer();
		this._server.on( 'request', this.onHttpRequest.bind( this ) );
		this._requests = [];
	}

	// keeps track of the running requests in this http server
	registerRequest ( request ) {
		if ( !(request instanceof HttpAppRequest) ) {
			throw new TypeError( 'Not an HttpAppRequest.' );
		}
		this._requests.push( request );
	}

	unregisterRequest ( request ) {
		for ( var i = this._requests.length - 1; i >= 0; --i ) {
			if ( this._requests[ i ] === request ) {
				this._requests.splice( i, 1 );
				return true;
			}
		}
		return false;
	}

	startListening ( port, host ) {
		this._server.listen( port, host );
	}

	close ( callback ) {

		var _this = this;
		this._server.close( function () {
			_this.onClose( callback );
		} );
	}

	onHttpRequest ( req, res ) {
		var appRequestClass = this._appRequestClass;
		if ( appRequestClass instanceof RequestRouter ) {
			appRequestClass = appRequestClass.route( this, req, res );
		}
		if ( appRequestClass instanceof Function ) {
			this.registerRequest( new appRequestClass( this, req, res ) );
		}
		else if ( appRequestClass instanceof HttpAppRequest ) {
			this.registerRequest( appRequestClass );
		}
		else if ( appRequestClass !== true ) {
			// if there is no handler close immediately
			res.writeHead( 500, { Connection: 'close' } );
			res.end();
		}
	}

}

module.exports = HttpApp;
