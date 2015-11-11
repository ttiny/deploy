0.3
---
- Added `start` command, alias for `run`.
- Added `!deploy` custom YAML element.
- Fixed a problem with syncing by repo where all project branches were synced.
- Removed `{branch.flat}` predefined variable. This can be achieved with JS function in the YAML.
- Removed `{branch.tag}` predefined variable. This can be achieved with JS function in the YAML.

0.2
---
- Added colors to the output.
- Added the ability to have multiple configurations for the same project.
- Added `list` command.
- Added `!if` custom YAML element.
- Added project dependencies support.
- Added dry run support.
- **Breaking:** Changed the syntax of `!yamlfiles` to explicitly specify if the files should be merged or concatenated.
- **Breaking:** Remove forced `project.` prefix for project variables.

0.1
---
- First release.
