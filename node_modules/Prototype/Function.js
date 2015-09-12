"use strict";

/**
 * Defines properties in the prototype of the function.
 * Each property will be added using Object.definePrototype.
 * @def function Function.define ( properties )
 * @param object Collection of properties.
 * @return this
 */
Object.defineProperty( Function.prototype, 'define', { 
	value: function ( prototype ) {
		var proto = this.prototype;
		for ( var i in prototype ) {
			Object.defineProperty( proto, i, { value: prototype[i], writable: true } );
		}
		return this;
	},
	writable: true
} );

/**
 * Defines properties in the the function object itself.
 * Each property will be added using Object.definePrototype.
 * @def function Function.static ( properties )
 * @param object Collection of properties.
 * @return this
 */
Object.defineProperty( Function.prototype, 'static', { 
	value: function ( prototype ) {
		for ( var i in prototype ) {
			Object.defineProperty( this, i, { value: prototype[i], writable: true } );
		}
		return this;
	},
	writable: true
} );


/**
 * Will make functions's prototype to inherit from given parent's prototype.
 * @def static function Function.extend ( parent, prototype )
 * @param Function
 * @param Object|undefined Prototype for the class itself.
 * @return this
 */
Object.defineProperty( Function.prototype, 'extend', { 
	value: function ( parent, prototype ) {
		this.prototype = Object.create( parent.prototype );
		this.define( prototype );
		return this;
	},
	writable: true
} );



/**
Passed as last argument to {@see Function.mixin()} to resolve conflicts.

```javascript
A.mixin( B, C, ResolveMixins( { 'overlappingMember':  B } ) );
```

@def function ResolveMixins ( resolve:Object )
*/
function ResolveMixins ( resolve ) {
	if ( !(this instanceof ResolveMixins) ) {
		return new ResolveMixins( resolve );
	}
	this.merge( resolve );
}

(function () {
	
	var _checkImplementation = function ( clas, iface ) {
		var names = Object.getOwnPropertyNames( iface );
		for ( var j = 0, jend = names.length; j < jend; ++j ) {
			var name = names[ j ];
			if ( iface[ name ] instanceof Function &&
			    !(clas[ name ] instanceof Function) ) {

				throw new Error( 'Method "' + name + '" is not implemented' );
			}
		}
	};

	var _markImplemented = function ( obj, proto ) {
		if ( !obj.prototype.hasOwnProperty( '__implements' ) ) {
			Object.defineProperty( obj.prototype, '__implements', { value: [], writable: false } );
		}
		
		var __implements = obj.prototype.__implements;
		do {
			__implements.push( proto );
			if ( proto.prototype === undefined ) {
				break;
			}
			proto = Object.getPrototypeOf( proto.prototype ).constructor;
			if ( proto === Object ||
			     proto === Array ||
			     proto === Function ||
			     proto === String ||
			     proto === Number ||
			     proto === Boolean ) {
				
				break;
			}
		} while ( proto );
	};

	Object.defineProperty( Function.prototype, 'implement', { value: function () {
			for ( var i = 0, iend = arguments.length; i < iend; ++i ) {
				var proto = arguments[ i ];
				
				_markImplemented( this, proto );

				do {
					_checkImplementation( this.prototype, proto.prototype || proto );
					// skip built ins
					if ( proto.prototype === undefined ) {
						break;
					}
					proto = Object.getPrototypeOf( proto.prototype );
					if ( proto === Object ||
					     proto === Array ||
					     proto === Function ||
					     proto === String ||
					     proto === Number ||
					     proto === Boolean ) {
						
						break;
					}
				} while ( proto );
			}
		},
		writable: false
	} );

	/**
	Mixes the prototype of another function into the prototype of this function.

	@def static function Function.mixin( mixinPrototype, ... )
	@param Object
	@return this
	*/
	Object.defineProperty( Function.prototype, 'mixin', { 
		value: function () {
			var arglen = arguments.length - 1;
			var resolve;
			if ( arglen > 0 && arguments[arglen] instanceof ResolveMixins ) {
				resolve = arguments[arglen];
			}
			else {
				++arglen;
			}
			for ( var i = 0; i < arglen; ++i ) {
				var mixin = arguments[ i ];

				_markImplemented( this, mixin );

				var prototype = mixin.prototype || mixin;
				var isProto = ( prototype !== mixin );
				var keys = Object.getOwnPropertyNames( prototype );
				// for ( var key in prototype ) {
				for ( var j = keys.length - 1; j >= 0; --j ) {
					var key = keys[ j ];
					if ( isProto && key === 'constructor' ) {
						continue;
					}
					if ( key === '__implements' ) {
						continue;
					}
					var value = undefined;
					if ( this.prototype[key] !== undefined ) {
						if ( resolve && resolve[key] !== undefined ) {
							var preffered = resolve[key];
							value = preffered.prototype ? preffered.prototype[key] : preffered[key];
						}
						if ( !value ) {
							throw new Error( 'Unable to mixin property "' + key + '", it is already defined' );
						}
					}
					else {
						value = prototype[key];
					}
					Object.defineProperty( this.prototype, key, { value: value, writable: true } );
				}
			}
			return this;
		},
		writable: true
	} );
})();


/**
 * Creates a wrapper function that always calls another function with the same arguments.
 * Bound arguments will be appended to any arguments that the function is called with.
 * @def function Function.bindArgsAfter ( ... )
 * @vaarg
 * @return function
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */
Object.defineProperty( Function.prototype, 'bindArgsAfter', { 
	value: function () {
		var func = this;
		var slice = Array.prototype.slice;
		var concat = Array.prototype.concat;
		var args = slice.call( arguments );
		return function ( ) {
			return func.apply( this, arguments.length ? concat.call( slice.call( arguments, 0 ), args ) : args );
		};
	},
	writable: true
} );



/**
 * Creates a wrapper function that always calls another function with the same arguments.
 * Bound arguments will be prepended to any arguments that the function is called with.
 * @def function Function.bindArgsBefore ( ... )
 * @vaarg
 * @return function
 * @author Borislav Peev <borislav.asdf@gmail.com>
 */
Object.defineProperty( Function.prototype, 'bindArgsBefore', { 
	value: function () {
		var func = this;
		var slice = Array.prototype.slice;
		var concat = Array.prototype.concat;
		var args = slice.call( arguments );
		return function ( ) {
			return func.apply( this, arguments.length ? concat.call( args, slice.call( arguments, 0 ) ) : args );
		};
	},
	writable: true
} );



if ( typeof global !== 'undefined' ) {
	global.ResolveMixins = ResolveMixins;
}
else if ( typeof window !== 'undefined' ) {
	window.ResolveMixins = ResolveMixins;
}