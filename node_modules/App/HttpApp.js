"use strict";

var App = require( './App' );
var HttpAppRequest = require( './HttpAppRequest' );
var Http = require( 'http' );

class HttpApp extends App {

	constructor ( appRequestClass, host, port ) {

		super();
		
		this._appRequestClass = appRequestClass;
		this._host = host;
		this._port = port;
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

	startListening () {
		this._server.listen( this._port, this._host );
	}

	close ( callback ) {

		var _this = this;
		this._server.close( function () {
			_this.onClose( callback );
		} );
	}

	onHttpRequest ( req, res ) {
		this.registerRequest( new this._appRequestClass( this, req, res ) );
	}

}

module.exports = HttpApp;
