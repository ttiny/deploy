"use strict";

require( 'Prototype' );

/**
Provides some resources to the application.

Each resource is identified by its id. Configs can be stacked effectively
providing resource sets that can be used for internationalization, theming and
others.

```js
// default language
var ENG = new Config( { hello: 'hello', bye: 'bye' } );

// another language extends the default
var DEU = new Config( { hello: 'hallo', bye: 'auf wiedersehen' }, ENG );
var langs = new Config( { hello: 'holla' }, DEU );
if ( langs.hello == 'holla' ) {
	// we have spanish string for hello
}
if ( langs.bye == 'auf wiedersehen' ) {
	// we don't have spanish string for bye and we use the german fallback
}
```

Values can contain references to other values and parametric values.

```js
var cfg = new Config( { a: 
	'{b.a}', 
	b: { 
		a: 'ba',
		b: 'bb {1}',
		parent_a: '{__.a}',
		this_a: '{__.a}' 
	}
} );

if ( cfg.get( 'a' ) == 'ba' ) {
	// ...
}
if ( cfg.get( 'b.parent_a' ) == 'ba' ) {
	// ...
}
if ( cfg.get( 'b.b', '1' ) == 'bb1' ) {
	// ...
}
```

@def class Config
@author Borislav Peev <borislav.asdf@gmail.com>
*/

/**
Creates a new config instance.
@def constructor Config ( defaultset:Object = "null", parent:Config = "undefined" )
@param Object with collection of properties for the config.
@param Parent config to inherit some properties from.
*/
class Config {
	
	constructor ( configset, parent ) {

		var that = this;
		var Config = function () {};
		Config.prototype = parent || this;
		var ret = new Config;

		if ( parent ) {
			ret.Parent = parent;
		}

		if ( configset ) {
			ret.merge( configset );
		}

		return ret;
	}

	/**
	The Config this instance is inheriting from.
	@def var Config.Parent:Config = "null"
	*/

	/**
	Finds all properties of the config matching a pattern.

	`*` in the pattern matches everything but dot, and `**` matches
	everything, non greedy.

	@def function Object Config.match( pattern:String )
	@return Returns Object where each key is the name of the matching property
	    and the value is {@see Config.Match}. Unlike {@see get()} returned
	    values will be raw, not passed through {@see render()}.
	*/

	match ( pattern ) {
		var regex = _regexCache[pattern];
		if ( regex === undefined ) {
			pattern = '^' + pattern
				.replace( RE_MATCH1, '\\$&' )
				.replace( RE_MATCH2, '(.*?)' )
				.replace( RE_MATCH3, '([^\.]*?)' ) + '$';
			regex = new RegExp( pattern );
			_regexCache[pattern] = regex;
		}
		var param = { regex: regex, ret: {}, config: this };
		_flatten( this, _match, param );
		return param.ret;
	}

	getRel ( id, args, ctx ) {
		
		// if we have a pattern
		if ( id.indexOf( '*' ) >= 0 ) {
			var ret = this.match( id );
				// console.log( ret )
			for ( var key in ret ) {
				var val = ret[ key ];
				ret[ key ] = this.renderRel( val.Value, args, [ val.Context ] );
			}
			return ret.filter( _filterGet );
		}
	

		var obj = ctx.last;

		// if we have a dot chain
		if ( id.indexOf( '.' ) > 0 ) {
			var ids = id.split( '.' );
			
			for ( var i = 0, iend = ids.length; obj !== undefined && i < iend; ++i ) {
				var objid = ids[ i ];
				if ( objid == '_' ) {
					// skip	
				}
				else if ( objid == '__' ) {
					ctx.pop();
					obj = ctx.last;
				}
				else {
					obj = obj[ objid ];
					if ( obj !== undefined ) {
						ctx.push( obj );
					}
				}
			}
		}
		else {
			obj = this[ id ];
			if ( obj !== undefined ) {
				ctx.push( obj );
			}
		}

		return this.renderRel( obj, args, ctx.slice( 0, -1 ) );
	}

	/**
	Retrieves a resource with a given id.

	Id could be a string delimited with dots or a pattern for {@see match()}.
	
	@def function Config.get ( id:String )
	@return mixed|Object|undefined For patterns returns Object where the key
	    is the name of the matched property and the value. Returns undefined
	    if nothing is found. All returned values will be passed through
	    {@see render()}.
	*/
	get ( id ) {

		var ret = this.getRel( id, Array_slice.call( arguments, 1 ), [ this ] );

		if ( ret === undefined && this.Parent ) {
			return this.Parent.get.apply( this.Parent, arguments );
		}

		return ret;

	}

	renderRel ( text, args, ctx ) {
		
		if ( text instanceof Function ) {
			return text.apply( this, args );
		}
		
		if ( String.isString( text ) && text.indexOf( '{' ) >= 0 ) {
			var _this = this;
			// check for variables
			return text.replace( RE_VARIABLE, function ( match, id ) {
				var n = parseInt( id );
				var value = null;

				// check for numbered vars
				if ( n > 0 && args && args.length >= n ) {
					value = args[ n - 1 ];
				}
				// no number or invalid number, it must be a property ref then
				else {
					if ( id.startsWith( '_.' ) || id.startsWith( '__.' ) ) {
						value = _this.getRel( id, null, [].concat( ctx ) );
					}
					else {
						value = _this.get( id );
					}
				}
				
				// if have something recurse rendering
				if ( value !== undefined ) {
					return _this.renderRel( value, null, ctx )
				}

				// don't change
				return match;
			} );
		}
		
		return text;
	}

	/**
	Converts config variable references in a text to their values.

	Variables are in the format {id} where id is either dot delimited string
	or number. If it is a number then this is taken from the arguments of
	render.

	@def function String Config.render ( text:String )
	*/
	render ( text ) {
		return this.renderRel( text, Array_slice.call( arguments, 1 ), [ this ] );
	}
}

var Array_slice = Array.prototype.slice;
var _regexCache = {};
var RE_MATCH1 = /[\?\.\+\[\]\(\)\{\}\$\^\\\|]/g;
var RE_MATCH2 = /\*\*/g;
var RE_MATCH3 = /\*(?!\?)/g;
var RE_VARIABLE = /{([\s\S]+?)}/g;

function _flatten ( obj, callback, param, prefix ) {
	for ( var i in obj ) {
		var val = obj[ i ];
		if ( Object.isObject( val ) ) {
			_flatten( val, callback, param, prefix ? prefix + i + '.' : i + '.' );
		}
		callback( param, prefix ? prefix + i : i, val, obj );
	}
	if ( prefix === undefined && obj.Parent ) {
		param.config = obj.Parent;
		_flatten( obj.Parent, callback, param );
	}
}

function _match ( param, name, value, ctx ) {
	var m = name.match( param.regex );
	if ( m && param.ret[name] === undefined ) {
		param.ret[name] = new Config.Match( param.config, name, value, m.slice( 0 ), ctx );
	}
}

function _filterGet ( val ) {
	return !(val instanceof Object);
}

Config.static( {
	/**
	@def object Config.Match {
		Config:Config,
		Name:String,
		Value:mixed,
		Matches:string[],
		Context:Object
	}
	@param Reference to the config object containing this property.
	@param Dot delimited string with the id of the property.
	@param Value of the matching property.
	@param Array of all submatching patterns.
	@param Context object of this value.
	*/
	Match: class { 
		constructor ( config, name, value, matches, ctx ) {
			this.Config = config;
			this.Name = name;
			this.Value = value;
			this.Matches = matches;
			this.Context = ctx;
		}
	}
} );

module.exports = Config;