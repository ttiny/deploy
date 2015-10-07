App module
==========
Application classes for Node.js.

```sh
npm install https://github.com/Perennials/app-node/tarball/master
```

<!-- MarkdownTOC -->

- [HttpApp](#httpapp)
	- [Example usage](#example-usage)
	- [Methods](#methods)
		- [Constructor](#constructor)
		- [.startListening()](#startlistening)
		- [.close()](#close)
		- [.onHttpRequest()](#onhttprequest)
- [RequestRouter](#requestrouter)
	- [Methods](#methods-1)
		- [.route()](#route)
- [HttpAppRequest](#httpapprequest)
	- [Methods](#methods-2)
		- [Constructor](#constructor-1)
		- [.getApp()](#getapp)
		- [.getDomain()](#getdomain)
		- [.getRequest()](#getrequest)
		- [.getResponse()](#getresponse)
		- [.onHttpHeaders()](#onhttpheaders)
		- [.onHttpContent()](#onhttpcontent)
		- [.onHttpError()](#onhttperror)
		- [.onError()](#onerror)
- [App](#app)
	- [Methods](#methods-3)
		- [.getArgv()](#getargv)
		- [.onClose()](#onclose)
		- [.close()](#close-1)
- [Config](#config)
	- [Example usage](#example-usage-1)
		- [Stacking](#stacking)
		- [References](#references)
- [Argv](#argv)
	- [Example usage](#example-usage-2)
- [CliColors](#clicolors)
	- [Example usage](#example-usage-3)
- [Authors](#authors)

<!-- /MarkdownTOC -->

HttpApp
-------

Extends [App](#app).

Provides a base for building HTTP server applications. The default
implementation takes care of reading the whole request and handling errors
with node domains, so errors are associated with the proper HTTP request.

To reuse this class one extends the [HttpAppRequest](#httpapprequest) class
and provides the constructor to `HttpApp`. The latter will install a request
handler and upon receiving a request will instantiate the user's
`HttpAppRequest` class. This way all logic associated with the request can be
placed in the proper context.

```js
var HttpApp = require( 'App/HttpApp' );
```

### Example usage

```js
"use strict";

var HttpApp = require( 'App/HttpApp' );
var HttpAppRequest = require( 'App/HttpAppRequest' );
var RequestRouter = require( 'App/RequestRouter' );

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
```

### Methods

- [Constructor](#constructor)
- [.startListening()](#startlistening)
- [.close()](#close)
- [.onHttpRequest()](#onhttprequest)

#### Constructor
Constructor. The `appRequestClass` argument is a constructor of a class
derived from `HttpAppRequest`. It will be used by `onHttpRequest()` to create
a new instance of this class for each incomming request. Alternatively an instance
of `RequestRouter` can be passed. Its [.route()](#route) method will be used
to determine the appropriate `HttpAppRequest` class.

```js
new HttpApp(
	appRequestClass:Function|RequestRouter
);
```

#### .startListening()
Starts listening for HTTP requests.

```js
.startListening(
	port:Number,
	host:String
);
```


#### .close()
Closes the HTTP server (http.Server.close). `.onClose()` will be called
before the callback.

```js
.close(
	callback:function()|undefined
);
```


#### .onHttpRequest()
Default HTTP request handler called directly from node's http.Server. The
default implementation does the domain handling and calls `.onHttpHeaders()`.
Can be overriden for advanced use.

```js
.onHttpRequest( req, res );
```


RequestRouter
-------------
May be used with `HttpApp` on incomming requests to decide the appropriate
class that will handle the request.

```js
var RequestRouter = require( 'App/RequestRouter' );
```

### Methods

#### .route()
This method must be overloaded to decide the class that will handle the
request. It returns a reference to the class itself, or in ES5 terms a
reference to the function that will construct an instance of this class.

It receives reference to the `HttpApp` and nodejs' request object from the
request handler of the HTTP server.

```js
.route(
	app:HttpApp,
	req:http.IncommingMessage
) : Function;
```


HttpAppRequest
--------------

This class is instantiated by the `HttpApp` class when there is incoming
server request.

The object encapsulates node's native types passed to the HTTP request
callback, as well as the domain associated with the request. It should be
subclassed to override the desired functionality.

```js
var HttpAppRequest = require( 'App/HttpAppRequest' );
```

### Methods

- [Constructor](#constructor-1)
- [.getApp()](#getapp)
- [.getDomain()](#getdomain)
- [.getRequest()](#getrequest)
- [.getResponse()](#getresponse)
- [.onHttpHeaders()](#onhttpheaders)
- [.onHttpContent()](#onhttpcontent)
- [.onHttpError()](#onhttperror)
- [.onError()](#onerror)

#### Constructor
Constructor. It receives reference to the `HttpApp` and nodejs' request and
response objects from the request handler of the HTTP server. This method will
create the node domain and associate it with the request and call
[.onHttpHeaders()](#onhttpheaders). Normally this constructor should be called
by the constructor of the derived classes.

```js
new HttpAppRequest(
	app:HttpApp,
	req:http.IncommingMessage,
	res:http.ServerResponse
);
```

#### .getApp()
Retrieves the HttpApp associated with this request.

```js
.getApp() : HttpApp;
```

#### .getDomain()
Retrieves the node Domain associated with this request.

```js
.getDomain() : Domain;
```

#### .getRequest()
Retrieves the node request associated with this request.

```js
.getRequest() : IncommingMessage;
```

#### .getResponse()
Retrieves the node response associated with this request.

```js
.getResponse() : ServerResponse;
```

#### .onHttpHeaders()
Called whenever there is HTTP request. The default implementation installs
'data' handler, reads the content and calls `.onHttpContent()`. The default
implementation will check the headers and decompress `gzip`, `deflate` or
`snappy` content. Can be overriden in case access to the HTTP headers is
needed before handling the content or for advanced use.

```js
.onHttpHeaders();
```


#### .onHttpContent()
Called whenever there is HTTP request and the whole request content is received.
**Must be overriden**.

```js
.onHttpContent(
	content:Buffer
);
```

#### .onHttpError()
Called whenever there is 'error' event on the HTTP request.

```js
.onHttpError(
	err:Error
);
```


#### .onError()
Called whenever uncaught exception happens in the context of an HTTP request.
The default handler will print the error to stderr and call `.close()` on the
`.App` objects. **Recommended to override**.

```js
.onError(
	err:Error
);
```


App
---

Base application class for `HttpApp`. Not to be used directly.

This class will install `.close()` as signal handler for `SIGINT`, `SIGHUP`,
`SIGTERM`, so it will try to close gracefully in all cases by calling `.onClose()`,
which is meant to do cleanup.

```js
var App = require( 'App/App' );
```

### Methods

- [.getArgv()](#getargv)
- [.onClose()](#onClose-1)
- [.close()](#close-1)

#### .getArgv()
Retrieves the `process.argv` parsed with `Argv.parse()`.

```js
.getArgv() : Object|null;
```


#### .onClose()
Performs application specific onClose (as preparation for graceful exit). The
default function does nothing but call the callback.

```js
.onClose(
	callback:function()|undefined
);
```

#### .close()
Performs `.onClose()` and then calls `process.exit( code )`.

```js
.close(
	code:Number
);
```


Config
------

The Config class provides stack-able object of properties, where the
properties in the objects of the upper layers can override the lower layers.

Properties can refer to other properties and have a dynamic (callback) value.

```js
var Config = require( 'App/Config' );
```

### Example usage

#### Stacking

```js
var Config = require( 'App/Config' );

// default language
var ENG = new Config( { hello: 'hello', bye: 'bye' } );

// another language extends the default
var DEU = new Config( { hello: 'hallo', bye: 'auf wiedersehen' }, ENG );

// and yet another one
var langs = new Config( { hello: 'holla' }, DEU );

// static propertiers can be accessed directly
if ( langs.hello == 'holla' ) {
	// we have spanish string for hello
}
if ( langs.bye == 'auf wiedersehen' ) {
	// we don't have spanish string for bye and we use the german fallback
}
```

#### References

```js
var Config = require( 'App/Config' );

var cfg = new Config( {
	shared: {
		separator: ', '
	},

	// we have absolute reference {name.full} and dynamic value {1}
	my_name: 'my name is {name.full}; i am {1} years old.',
	
	name: {
		first: 'tosho',
		last: 'afrikanski',
		
		// this is relative reference from the current node (_) or from the parent node (__)
		// _ and __ are equivalent to . and .. when dealing with the file system in the shell
		// they can be chained, of course, like __.__.and.so.on
		full: '{_.last}{__.shared.separator}{_.first}'
	}
} );

if ( cfg.get( 'my_name', 30 ) == 'my name is afrikanski, tosho; i am 30 years old.' ) {
	// ...
}
```


Argv
----

Helps with parsing application command line.

```js
var Argv = require( 'App/Argv' );
```

### Example usage

```js
var Argv = require( 'App/Argv' );

var argv = Argv.parse( [ '-arg1=value', '-flag', 'arg2', '-arg3=1', '-arg3=2', '-arg3' ] );
// this will become
{ arg1: 'value', flag: true, "2": 'arg2', arg3: [ '1', '2', true ] };
```


CliColors
---------

Provides the list of basic terminal color palette.

The colors are: `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`.

Each color has `bright` (or `intense`) and `bg` (background) variants. E.g.
`brightblue`, `redbg`, `intenseredbg`.

Additionally:

* `gray` is synonim for `intenseblack`.
* `def` - default foreground.
* `defbg`, - default background.
* `reset` - reset all styles.

```js
var clr = require( 'App/CliColors' );
```

### Example usage

```js
var clr = require( 'App/CliColors' );

console.log( clr.blue, clr.greenbg, 'blue on green background',
             clr.def, 'default on green background',
             clr.reset, 'default' );
```

Authors
-------
Borislav Peev (borislav.asdf at gmail dot com)
