"use strict";

var HttpApp = require( '../HttpApp' );
var HttpAppRequest = require( '../HttpAppRequest' );
var HttpRequest = require( 'Net/HttpRequest' );
var RequestRouter = require( '../RequestRouter' );

UnitestA( 'Empty handler', function ( test ) {

	var app1 = new HttpApp( null );
	app1.startListening( 55555, '127.0.0.1' );
	(new HttpRequest( 'http://127.0.0.1:55555' ))
		.setHeader( 'someting', 'custom' )
		.send( 'asd.qwe', function ( res ) {
			test( res.isError() );
			app1.close( function () {
				test.out();
			} )
		} );

} );

UnitestA( 'RequestRouter', function ( test ) {

	class TestAppRequest extends HttpAppRequest {
		onHttpContent ( content ) {
			test( this._request.headers.someting === 'custom' );
			test( content.toString() === 'asd.qwe' );
			this._response.end();
			this._app.close( function () {
				test.out();
			} );
		}
	}

	var app1 = new HttpApp( new class extends RequestRouter {
		route ( app, req, res ) {
			if ( req.headers[ 'someting' ] === 'custom' ) {
				return TestAppRequest;
			}
		}
	} );
	app1.startListening( 55555, '127.0.0.1' );
	(new HttpRequest( 'http://127.0.0.1:55555' ))
		.setHeader( 'someting', 'custom' )
		.send( 'asd.qwe' );

} );

UnitestA( 'HttpAppRequest.onHttpContent', function ( test ) {

	class TestAppRequest extends HttpAppRequest {
		onHttpContent ( content ) {
			test( this._request.headers.someting === 'custom' );
			test( content.toString() === 'asd.qwe' );
			this._response.end();
			this._app.close( function () {
				test.out();
			} );
		}
	}

	var app1 = new HttpApp( TestAppRequest );
	app1.startListening( 55555, '127.0.0.1' );
	(new HttpRequest( 'http://127.0.0.1:55555' ))
		.setHeader( 'someting', 'custom' )
		.send( 'asd.qwe' );

} );

UnitestA( 'Parallel domain handling', function ( test ) {

	var nreq = 0;
	var nerr = 0;

	class TestAppRequest extends HttpAppRequest {
		onHttpContent ( content ) {
			this._request.content = content;
			++nreq;
			if ( nreq === 1 ) {
				setTimeout( function () {
					throw new Error( '1' );
				}, 100 );
			}
			else if ( nreq === 2 ) {
				setTimeout( function () {
					process.nextTick( function () {
						throw new Error( '2' );
					} );
				}, 50 );	
			}
			else if ( nreq === 3 ) {
				throw new Error( '3' );
			}
		}

		onError ( err ) {
			++nerr;
			this._response.end();
			if ( nerr === 1 ) {
				test( err.message === '3' );
				test( this._request.content.toString() === '333' );
				this._app.close( function () {
					test.out();
				} );
			}
			else if ( nerr === 2 ) {
				test( err.message === '2' );
				test( this._request.content.toString() === '222' );
			}
			else if ( nerr === 3 ) {
				test( err.message === '1' );
				test( this._request.content.toString() === '111' );
			}
		}
	}

	var app1 = new HttpApp( TestAppRequest );
	app1.startListening( 55555, '127.0.0.1' );
	(new HttpRequest( 'http://127.0.0.1:55555' )).send( '111' );
	(new HttpRequest( 'http://127.0.0.1:55555' )).send( '222' );
	(new HttpRequest( 'http://127.0.0.1:55555' )).send( '333' );
} );
