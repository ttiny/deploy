1.10
===
- Added `RequestRouter` to support different request handlers with `HttpApp`.

1.9
===
- Changed the behaviour of `Config.render()` to replace not-found value refs with empty string.

1.8
===
- Moved the host/port parameters from `HttpApp.constructor()` to `HttpApp.startListening()`.

1.7
===
- Added `Config.set()`.

1.6.1
===
- Async fixes.

1.6.0
===
- All public properties in `HttpAppRequest` are now private and exposed via getters.

1.5.4
===
- Fix: `HttpAppRequest.dispose()` was not called in some cases.

1.5
===
- Add support for `--arg value` notation in `Argv`.

1.4
===
- Move to classes internally.
- Require Node.js >= 4.0.0.
- Fix double error message text in `HttpAppRequest.onError()`.

1.3
===

- `HttpApp.close()` will no longer exit the process, just the HTTP server.
- `HttpApp.close()` now accepts a callback argument instead of exit code.


1.2
===

- Big refactoring of `HttpApp`. Request are not handled in the App class
  anymore but have their own `HttpAppRequest` instance.

1.1
===

- Renamed `App.shutdown()` to `App.close()`.
- Renamed `App.cleanup()` to `App.onClose()`.
- Started keeping changelog.