"use strict";

var HttpApp = require( '../HttpApp' );
var HttpAppRequest = require( '../HttpAppRequest' );
var RequestRouter = require( '../RequestRouter' );

// this will be instantiated by HttpApp whenever we have a new request coming in
class MyAppRequest extends HttpAppRequest {
	
	onError ( err ) {

		console.log( 'Damn, error happened with this specific client request', Object.toString( this._request ) );

		// finish the response so we can close the server
		this._response.writeHead( 500 );
		this._response.end();

		// call the default handler, which will abort the app
		super.onError( err );
	}


	// this will be called when we have the whole http request
	onHttpContent ( content ) {

		// we have the full request at this point, headers and content
		if ( this._request.headers[ 'content-encoding' ] === 'identity' ) {
			console.log( 'The request content is', content.toString( 'utf8' ) );
		}

		doSomethingWithThe( this._request, function ( good ) {

			// normal nodejs handling of the response
			this._response.writeHead( good ? 200 : 500, {
				'Connection': 'close',
				'Content-Type': 'text/plain'
			} );
			this._response.end( 'bye' );

		} );

	}
}

// construct a new HttpApp, here we give it a RequestRouter to show its usage,
// but we could replace this with MyAppRequest if have only one request handler
var app = new HttpApp( new class extends RequestRouter {

	// just demonstrate how to use the router, it does nothing in this example
	route ( app, req ) {
		// if we receive a request with header like this we choose one handler
		if ( req.headers[ 'my-proc' ] == 'NonExistentProc' ) {
			return NonExistentProc;
		}
		// otherwise we choose other handler
		else {
			return MyAppRequest;
		}
	}

} );
app.startListening( 1337, '0.0.0.0' );


setTimeout( function () {
	require( 'child_process' ).exec( 'curl localhost:1337' );
}, 300 );
