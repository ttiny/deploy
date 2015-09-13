### 1.5.0
- Changed the behavior of `Object.duplicate()`. It will not attempt to
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