### 1.6.0
- Added `String.contains()`.
- Added `Array.contains()`.

### 1.5.2
- Fix `Object.newArgs()` with ES6 classes.
- **Breaking:** `Object.newArgs()` will always return an instance of the
  constructor, even if it has return statement inside. This behaviour is
  different from the ES5 compatible implementation.

### 1.5.1
- Fix `Object.mergeDeep()` when the a matching key to be merged is not an Object.

### 1.5.0
- Changed the behaviour of `Object.duplicate()`. It will not attempt to
  duplicate arbitrary objects anymore, only strictly `Object`.

### 1.4.0
- Require Node.js >= 4.0.0.
- Rename `Function.defineStatic()` to `Function.static()`.

### 1.3.0
- Added `Object.mergeDeep`.

### 1.2.0
- Added `String.toFirstUpperCase`.

### 1.1.3
- Removed `Function.bind()` JS implementation which was causing problems in some cases with node-inspector.

### 1.1.2
- Minor internal fixes.

### 1.1.1
- Added interface support with `Function.implement()` and `Object.instanceof()`.
- Added improved `Array.map()`.
- Started to keep changelog.