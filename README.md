Deploy
======
A tool for git and Docker deployments. A middle ground between simple Docker composition tools and full blown cluster orchestration.

_The project is not battle tested in production yet._

The tool performs three functions (not necessarily all of them):

1. [Synchronizes](#git-commands) local git repositori(es), possibly triggered
   by a [webhook](#rest-usage).
2. [Builds](#image-commands) Docker images and pushes them to a Docker
   registry (optionally and experimentally with [rocker](https://github.com/grammarly/rocker)).
3. [Runs](#pod-commands) Docker container pods (currently with
   [rocker-compose](https://github.com/grammarly/rocker-compose)).

**deploy** is meant to be used in an dev-staging-production environment, where
the dev environment will sync application sources in response to git webhook.
From these sources Docker images would be built and and pushed to a registry
and finally the images can be deployed, without sources outside the containers,
to staging and production. For overview tutorial of this process check [here](https://github.com/Perennials/deploy/tree/master/examples/tutorial).

**deploy**'s configuration is suited for managing more than a few projects:
- It is declarative and short to type.
- It supports splitting the configuration into multiple files (e.g. one per project).
- It supports reusable/extendable project templates.
- It supports project dependencies.
- One can create hollow projects only describing dependencies to other projects
  and in this way manage whole sever deployments with simple few word
  commands.

All functionality is available via CLI or REST interface and the REST server
also handles webhooks. Currently the webhooks from GitHub are supported with
GitLab on the way.

<!-- MarkdownTOC -->

- [Tutorial](#tutorial)
- [Installation](#installation)
  - [Docker](#docker)
  - [Native](#native)
- [CLI usage](#cli-usage)
  - [Commands](#commands)
  - [Project syntax](#project-syntax)
  - [Branch syntax](#branch-syntax)
  - [Options](#options)
  - [Examples](#examples)
  - [Misc commands](#misc-commands)
    - [List](#list)
  - [Git commands](#git-commands)
    - [Sync](#sync)
    - [Clean](#clean)
  - [Image commands](#image-commands)
    - [Build](#build)
    - [Push](#push)
    - [Remove images](#remove-images)
  - [Pod commands](#pod-commands)
    - [Run](#run)
    - [Stop](#stop)
- [REST usage](#rest-usage)
  - [REST syntax](#rest-syntax)
  - [Webhooks](#webhooks)
  - [Colors in the HTTP output](#colors-in-the-http-output)
- [Configuration](#configuration)
  - [Format](#format)
    - [Conditional markup](#conditional-markup)
  - [HTTP configuration](#http-configuration)
  - [Git authentication](#git-authentication)
    - [Credentials configuration](#credentials-configuration)
      - [GitHub](#github)
  - [Project configuration](#project-configuration)
    - [Variables](#variables)
      - [Debugging](#debugging)
      - [Example](#example)
    - [Projects](#projects)
      - [Variables](#variables-1)
      - [Events](#events)
      - [Dependencies](#dependencies)
      - [Repo configuration](#repo-configuration)
      - [Image configuration](#image-configuration)
      - [Pod configuration](#pod-configuration)
    - [Example](#example-1)
- [Authors](#authors)

<!-- /MarkdownTOC -->


Tutorial
--------
[This tutorial](https://github.com/Perennials/deploy/tree/master/examples/tutorial)
is meant as illustration along these docs and to show the whole picture how
**deploy** was intended to be used. It is not a sufficient source of
information without the docs here.


Installation
------------

### Docker

1. Make some empty dir, e.g. `/myconfig`.
2. Put your private SSH key `id_rsa` (if you need one) and your **deploy** config
   `local.yml` in `/myconfig`. If you experience problems with the key you can place
   a file called `DEBUG` in the config directory, this will enable the output of the
   ssh agent, which is normally suppressed.
3. Make some dir where you will sync your projects, e.g. `/myapps`, it needs
   to be accessible inside the container, as well as all other dirs referenced
   in your config.
4. Use from the CLI like (replace with your actual paths):

   ```sh
   docker run --rm -ti \
                   -v /myapps:/myapps \
                   -v /myconfig:/app/config \
                   -v /var/run/docker.sock:/var/run/docker.sock \
                   -v /user/.docker:/root/.docker \
                   perennial/deploy:master \
                   deploy sync "*#*"
   ```

   Explanation:

   - `-v /myapps:/myapps` - this is somewhere to be able to do git clones and
     similar, doing it in the container makes little sense.
   - `-v /myconfig:/app/config` - this is the local config for the **deploy**
     app and the SSH private key for git.
   - `-v /var/run/docker.sock:/var/run/docker.sock` - this is so the container
     can access the Docker API.
   - `-v /user/.docker:/root/.docker` - this is so docker login will carry
     inside the container.

   Replace `/user/.docker` with your actual user directory, if you need to push, or remove this line otherwise.
   The last two arguments (`sync "*#*"`) is the actual deploy command, you can change it.

   Of course you will want to make this into a shell script for reuse, replacing
   the deploy arguments with `$@` and symlinking it in your path, so you can
   just type `deploy sync my#branch`... Or if you start it without arguments
   it will start a web server, but you will need to add port redirect like `-p 80:80`.

5. Or start an HTTP server

   ```sh
   docker run --rm -ti -p 80:80 \
                       -v /myapps:/myapps \
                       -v /myconfig:/app/config \
                       -v /var/run/docker.sock:/var/run/docker.sock \
                       -v /user/.docker:/root/.docker \
                       perennial/deploy:master
   ```
   Normally you will want to start this as a daemon, e.g. `-d --restart=aways`.

6. Now you can use the REST interface to trigger commands or receive webhooks.

### Native

You need Node.js >= 4.0.0. If you don't have it you don't need to install it system wide. You can just download the
archive, extract it somewhere and use the `node` command from the `bin` directory there.

1. Download the contents of this repo either from the zip button or from the releases section.
2. Extract somewhere, open a shell and cd to that directory.
4. You can start the app with `node deploy.js` or the `deploy` shell script.

Make sure you have git, docker, rocker and rocker-compose installed, so **deploy** can start them!


CLI usage
---------

The CLI syntax is to pass one or more commands to be performed on a given
project and given branch. Multiple commands are performed in the same order
and are separated with commas, without space.

```sh
deploy <command[,command]..> <project[#branch]>.. [OPTIONS]..
```

#### Commands

Command is one or more of bellow:
- [Misc commands](#misc-commands)
- [Git commands](#git-commands)
- [Image commands](#image-commands)
- [Pod commands](#pod-commands)

#### Project syntax
The project can be given as literal name, which should match the one in the configuration, as repository or as `*`.

The repository syntax is `repo:host/user/repo`. For example
`repo:github/Perennials/deploy`. Passing a repository for the project will
perform the command on all projects related to this repository. Notice the host
is not `github.com` but just lowercase `github`. This is the format used
everywhere throughout the configuration.

Passing `*` will perform the command on all projects.

It is possible to pass multiple projects to perform the command on.

#### Branch syntax
The branch can be given as as literal name or `*`.

The branch can be ommited if a project is configured explicitly with a single
branch, that is not a regular expression. Passing `*` will perform the command
on all enabled branches.

**Remark:** Using `*` for a branch may use the `repo` configuration of
the project. **deploy** will use the credentials from the config to find all
remote branches for this repo. `*` can be used on a project without `repo` configuration
or without `credentials` configuration for the given `repo`, but only for public
`repos` or only for the `branches` listed in the project configuration. 


#### Options

These are global options for all all commands. Specific commands may have additional options.

- `--var <name>=<value>` - allows for overriding [global variables](#variables).
  May occur multiple times.
- `--config <pathname>` - allows for loading config(s) from custom file instead
  of `config/local.yml`. May occur multiple times and configs will be merged.
- `-dry` - performs the command(s) in dry run mode, that is only display what
  is to be done without actually doing it. This has no effect for the `list`
  command because it is another form of dry run.
- `-deps` - performs the commands including all dependencies for these commands.
- `-no-deps-cache` - disable dependencies cache. This means normally, if
  project A and B are built in the same command and they both depend on
  project C being built, **deploy** will build C only once. This may not work in
  some circumstances if, for example, something else is executed in the mean
  time that does rmi on project C before starting to build project B. This
  flag disables this sort caching and will do all commands on all deps all the
  time.


#### Examples

```sh
deploy sync myproject#master
```

```sh
deploy clean,sync "myproject#*"
```

```sh
deploy sync repo:github/Perennials/deploy#master
```

```sh
deploy list "*#*"
```

### Misc commands

#### List
Lists all matching projects and branches. Useful to test wildcards. If the
`-deps` switch is given it will show the dependencies of the projects. The
`-deps` switch can be given an argument to narrow down the dependencies only
for specific command (`sync`, `clean`, `build`, `push`, `rmi`, `run`, `stop`).

```sh
deploy list <project[#branch]> [-deps[=command]]..
```

### Git commands
Git commands can be performed only on projects with [repo configuration](#repo-configuration).

**!!! Warning:** this functionality is only intended for mirroring remote repositories automatically.
It will make all effort to ensure that this will not fail, including doing hard reset and deleting
conflicting untracked files. It should not be used in a real working copy.

**!!! Warning:** because of the above warning make sure you don't execute the command in a wrong local
directory (based on the [repo config](#repo-configuration)) because `git reset` may cause loss of data.


#### Sync
The command will sync the repo for the specified project and branch. If the local copy does not exist,
the repo will be cloned recursively. If a local copy exists the remote will be pulled recursively.
The `filter` flag can be used when multiple repos are specified in the config.

**!!! Warning:** all local changes and conflicts will be discarded **without backup or confirmation.** 

```sh
deploy sync <project[#branch]> [-tag=tag] [-filter=repo]
```

Using the option `-tag` one can specify to synchronize to a specific tag in the repo. This will work
only for repos without explicitly specified branch in the remote URL. E.g. if the repo in the config
is specified as 'github/Perennials/deploy#master', adding a `-tag` option will still synchronize the
tip of the master branch. But if the remote repo is specified as `github/Perennials/deploy`, then the
`-tag` option can be used to sync to specific tag. The reason for this behaviour is that a project
may declare multiple repos and they will rarely have their tags synchronized. So the option to sync
a tag is meant to be used on the main repo of the project, since it will usually match the project
branch and it will not be explicitly specified in the remote URL.


#### Clean
The command will remove all local repositories for the project **without backup or confirmation.**
Projects with label `dont-clean` will be skipped, unless the `-force` flag is passed.
The `filter` flag can be used when multiple repos are specified in the config.

```sh
deploy clean <project[#branch]> [-force] [-filter=repo]
```


### Image commands
Image commands can be performed only on projects with [Image configuration](#image-configuration)

#### Build
The command will build the Docker image(s) for the specified project and branch.

```sh
deploy build <project[#branch]> [-pull] [-no-cache] [-debug-image] [-push] [-attach] [-filter=image]
```

`-pull` and `-no-cache` is passed to both docker and rocker as `--pull` and `--no-cache`.

The `-debug-image` flag is used with only with rocker to print the `Rockerfile` after
the variables has been substitued.

`-attach` and `-push` are passed to rocker only as `--atach` and `--push`.

#### Push
The command will push the Docker image(s) for the specified project and branch.
The `filter` flag can be used when multiple images are specified, it can include wildcards.

```sh
deploy push <project[#branch]> [-filter=image]
```

#### Remove images
The command will remove the Docker image(s) for the specified project and branch.
Projects with label `dont-rmi` will be skipped, unless the `-force` flag is passed.
`-force` will also carry to the Docker `rmi` command. The `filter` flag can be used
when multiple images are specified, it can include wildcards.

```sh
deploy rmi <project[#branch]> [-force] [-filter=image]
```


### Pod commands
Pod commands can be performed only on projects with [pod configuration](#pod-configuration).

#### Run
The command will run the Docker container(s) pod for the specified project and branch.
All non-existing host directories that are to be bound as container volumes will be
created prior to launching the pod.

```sh
deploy run|start <project[#branch]> [-debug-pod[=more]] [--cmd command]
```

`-debug-pod` will print the rendered pod definition which is passed to
rocker-compose. Adding `=more` will print even more info from rocker-compose.

`--cmd` is a special case and if passed it will carry to a variable called `cmd` in
rocker-compose, so it can be used in the pod definition to customise the container command.

#### Stop
The command will run the Docker container(s) pod for the specified project and branch.

```sh
deploy stop <project[#branch]> [-debug-pod]
```

`-debug-pod` will print the rendered pod definition which is passed to
rocker-compose.


REST usage
----------

Starting the script without arguments will create an HTTP server according to the
configuration and listen for REST requests or webhooks.

```sh
deploy
```

### REST syntax

```
http://myserver.com/<action>[/project[/branch]][?secret=secret-access[&flag]..]
```

The syntax for `action`, `project` and `branch` is the same in the CLI interface, with the
addition of the `deploy` action which has special purpose for webhooks. `secret-access` may
be used if it is allowed in the configuration.

```
http://myserver.com/sync/myproject/master
```

```
http://myserver.com/clean,sync/myproject/*?rmi&force
```

### Webhooks

Use URL like this for the webhook configuration:

```
http://myserver.com/deploy
```

Or just pass any REST URL as webhook. This is actually the REST URL for the
`deploy` command. The `deploy` command has special purpose and is only
available for webhooks. It means to detect the command from the webhook
payload. In other words it will perform either `sync` or `clean` depending if
you push something in the branch or delete the branch.

With this syntax the project and the branch will also be auto detected from
the webhook payload.

Otherwise you can force specific action or specific project and/or branch. If
the project or the branch is omitted it will be auto detected from the
payload. For example:

```
http://myserver.com/sync/myproject/master?secret=itsme
```

### Colors in the HTTP output

- If you want HTML output send header `Accept: text/html`.
- If you want plain text output with ANSI colors send header `Accept: text/tty`.
- Otherwise you will get plain text without colors.


Configuration
-------------
The configuration is read from `config.yml` and optionally merged with
`config/local.yaml`. Or optionally, with the `--config` CLI argument, from any
file.

### Format

The project configuration is in flexible YAML format provided by
[js-yaml](https://github.com/nodeca/js-yaml). The pod definitions are in YAML
format accepted by [rocker-compose](https://github.com/grammarly/rocker-compose).

Besides the custom elements provided by [js-yaml](https://github.com/nodeca/js-yaml),
which enable specifying JavaScript regular expressions and functions inside the configuration,
**deploy** has several custom types of itself. All of these can be used anywhere and will
be evaluated only when they are need. For example using a `!!js/function` for the value of
a variable, will evaluate the function only when the variable needs to be substituted in a
given context. The custom types provided by **deploy** are:

Property | Description
---- | ----
`!cmd command` | Will execute a shell command and use its output as a value.
`!echo text` | Will echo the text to the console.
`!yamlfile file` | Will parse a YAML file and incorporate its contents in the document.
`!yamlfiles concat|merge pattern` | Will parse all YAML files matching the `pattern` and incorporate their contents in the document. If `merge` is given and all files contain mappings the return value will be a merged mapping, otherwise an array of all the values.
`!textfile file` | Will read a file as a plain text and use it as a value.
`!if ...` | Conditional markup. See [bellow](#conditional-markup).
`!deploy command project#branch` | Performs a **deploy** command on the specified project and branch. E.g. `!deploy sync myproject#1.0`. The branch can be omitted if it can be inferred from the config. The project and branch syntax here only supports literal project and branch name, no wildcards or repos like on the CLI.

#### Conditional markup
It is possible to use the `!if` custom YAML element to create different subtree based on a condition. The syntax is follows:

```yaml
!if >
/condition1 operator condition2/
# then document
/else/
# else document
```

- `condition1` and `condition2` can be a YAML value, including variables.
- `operator` could be `==` or `!=`.
- `then document` and `else document` is YAML structure.
- The `else` block is optional.

**Example:**

Lets assume we have a dev environment and we want to bind some directory as
volume only on the dev environment. We can place the dependency in an `!if`
and the markup won't be include in different environment.

```yaml
deps:
  run: !if >
    /${env} == 'dev'/
    providerkit#{project.sdk.version}: sync
```

---------

The configuration has three main sections, all placed in the root of the config file.

- [HTTP configuration](#http-configuration)
- [Git authentication](#git-authentication)
- [Project configuration](#project-configuration)

### HTTP configuration
Presented bellow is the default configuration for the REST interface. It only
allows connections from GitHub and localhost. If you want to access it
remotely you either need to add your IP in the known hosts, or enable and pass
a _secret_ when connecting.

```yaml
http:
  host: 0.0.0.0
  port: 80

known-hosts:
  localhost: 127.0.0.1
  github: 192.30.252.0/22

# secret-access: 'itsme'
```
 Property | Description
---- | ----
`http.host` | IP address to listen. `0.0.0.0` will listen on all available addresses.
`http.port` | Port to listen on. You may need special access to listen on the default port `80`.
`known-hosts` | List of known hosts. Only IPs in this list are allowed access to the REST interface (or ones who know the secret, if it is enabled).
`secret-access` | A password to allow access from outside the known hosts. If it is an empty string `''` all access is allowed without providing a secret. If it is not specified, i.e. commented like the default, secret access is disabled.



### Git authentication
Git commands require `git` to be installed and properly configured with SSH
key (if you plan to use private repositories). For more information check the
[tutorial on GitHub](https://help.github.com/articles/generating-ssh-keys/).

Additionally, to be able to perform bulk commands, that is commands on
multiple branches, depending on your configuration **deploy** may need to use
the web APIs to determine the available branches. For this to work
`credentials` configuration must be supplied.

#### Credentials configuration
It is not mandatory, but without it you will not be able to execute commands
like `deploy sync myproject#"*"`, or it will work only for manually defined
branches.

##### GitHub
You can authenticate for GitHub either with your username and password or with [access token](https://help.github.com/articles/creating-an-access-token-for-command-line-use/). If both are supplied `token` will be preferred. You can give multiple authentications for different users or organisations.

```yaml
credentials:
  github:
    user:
      token: authentication_token
      username: username
      password: password
```

Property | Description
---- | ----
`credentials.github.user` | Replace `user` with the actual GitHub user or organisation who's repositories these credentials will grant access to. It does not need to be the same as the `username`. Case sensitive, must match the repo configuration, e.g. for repo `github/Perennials/deploy` the user here should be `Perennials`, but the `username` may be any user with access to the repo.


### Project configuration
There are two sections in the root of the config file related to the project configuration.

#### Variables
Just a list of global variables that can be reused elsewhere in the
configuration. To use the variable use the `{variable_name}` or
`${variable_name}` syntax anywhere. Variables will be resolved when they are
actually used, not at the time of loading the config. If a variable is used as
sole value of some node, it should be quoted or prepended with `$` to
disambiguate the YAML mapping syntax.

```yaml
vars:
  name: value
```

The following global variables will be predefined.

Variable | Description
---- | ----
`{deploy.root}` | The root directory where the application itself resides.

##### Debugging
Sometimes it is useful to be able to debug the values of your variables. If
you place a variable `debug: true` the variables (either global or project)
will be printed after they are loaded.

You can use something like `deploy debug --var debug=true --var project.debug=true`.
Debug is not valid command so the program will terminate. Of course you could use real command.

##### Example
```yaml
vars:
  
  # defines a global variable named env with value dev
  env: dev

  # reference to the variable {env} inside another value, will be replaced with dev
  apps.root: /{env}/apps/

  # custom elements, this will execute the command id when this variable is substitued
  username: !cmd id -u -n
  
  # if we don't use the quotes here YAML will interpret it as mapping
  # this will likely lead to errors
  env.ref: '{env}' 
```

#### Projects
Projects are described in the `projects` root node. Projects can be reused as
templates. All project sub-configuration is optional.

Projects is either a mapping or an array of mappings. Additionally if the array
items are mappings with one key it will be assumed to be a name of the project.

It is possible to have different projects with the same, e.g. to have different
configuration for different branches. To make use of this either use an array or
put the name of the branch in the project (see bellow).

Mapping:

```yaml
projects:
  foo:
    extends: other_project
    template: true
    labels: just some labels
    branches:
      # enabled branches for the project
    vars:
      # project specific variables
    events:
      # project specific event handlers
    deps:
      # project dependencies
    repo:
      # repo configuration for the project
    image:
      # docker image configuration for the project
    pod:
      # pod configuration for the project
  bar:
    extends: ...
    #...
```

Array of mappings. In this case the name should be given as property:

```yaml
projects:
  - name: foo
    extends: ...
    #...
  - name: bar
    extends: ...
    #...
```

Array of mappings with one key (used as a name):

```yaml
projects:
  - foo:
      extends: ...
      branches: ...
      #...
  - bar:
      extends: ...
      branches: ...
      #...
```

If the name of the project contains a branch name, the branch will be appended
to the list of branches. This is to support different configurations for
branches that may be too different.

```yaml
projects:
  foo#1.0:
    #...
  foo#2.0:
    #...
```

Property | Value type | Description
---- | ---- | ----
`name` | string | The name of the project.
`extends` | string | A template to use for the base of this project. The properties of this project will be merged recursively with the template.
`template` | `true` | Indicates the project is a template to be used for base of other projects and should be excluded of normal project treatment.
`labels` | string | A space separated list of labels. Currently only the labels `dont-clean` and `dont-rmi` has any use - to protect projects from being cleaned by mistake when cleaning with wildcard.
`branches` | string\|string[] | Enabled branches for the project. You can specify one or multiple branches. Commands on branches outside of this list will be ignored. The default is `*`, which means all branches are enabled. The [js-yaml](https://github.com/nodeca/js-yaml) `!!js/regexp` custom type can be used here.
`vars` | mapping | A list of project specific variables. The same as in the root section but all names will only be available in the context of the project, not globally.
`events` | mapping | A list of project specific event handlers. These are some commands that will be executed upon some event ([see bellow](#events)).
`deps` | mapping | A list of project dependencies. These are some projects and their commands that will be executed as prerequisite for performing a command on the project ([see bellow](#dependencies)). Dependencies will be ignored if the `-deps` flag is not given.
`repo` | mapping\|mapping[] | Repo configuration for the project. [See bellow](#repo-configuration).
`image` | mapping\|mapping[] | Docker image configuration for the project. [See bellow](#docker-configuration).
`pod` | mapping | Pod configuration for the project. [See bellow](#pod-configuration).

###### Variables
Besides the [global variables](#variables) defined in the root of the configuration, the following variables will available in the scope of the project.

Variable | Description
---- | ----
`{project}` | Name of the current project.
`{branch}` | Name of the current branch.

###### Events
Projects support events. Events are executed before and after each command. The name of the event is composed from the name of the command (`sync`, `clean`, `build`, `push`, `rmi`, `run`, `stop`) and a suffix:


Event | Description
---- | ----
`command.start` | Will be fired before a command is performed.
`command.error` | Will be fired after a command is performed if it results in error.
`command.success` | Will be fired after a command is performed if it results in success.
`command.finish` | Will be fired after a command is performed, regardless if the command resulted in success or error. This will be fired after the `.success` or `.error` event.

Each event can have one or multiple handlers, for example lets assume we want
to temporarily copy some dependency inside the project directory, just during
the build process so it will be available for Docker:

```yaml
events:
  build.start:
    !cmd cp -rf {project.sdk} {project.local}/lib/sdk
  build.finish:
    - !cmd ls -l {project.local}/lib/sdk
    - !cmd rm -rf {project.local}/lib/sdk
```

###### Dependencies
Projects can declare dependencies with other projects. It is possible to
create dummy projects that does nothing but declare dependencies and this way
group projects logically. Dependencies will only be executed if the `-deps`
CLI flag is given.

Dependencies are given per command or for all commands. All sections are optional.
The `#branch` is also optional if it is possible to infer it, i.e. if the project
has only one static branch defined.

```yaml
deps:
  all:
    - project1#branch
    - project2#branch
    # ...
  command:
    all: command1, command2
    project#branch: command1, command2
    project#branch: command1, command2
```

Event | Type | Description
---- | ---- | ----
`all` | string[] | Array of projects and they branches that will be inserted as dependency for each command. The subcommand, that is the command executed on the dependency will be the same as the command on the main project.
`command`: mapping | `command` should be replace with the actual command, i.e. one of `sync`, `clean`, `build`, `push`, `rmi`, `run`, `stop`, `skip`. Each key of the mapping is a dependency project with its branch. The value is either an array if commands to be performed on the dependency or string that is command separated list of commands. The `all` key has special meaning - it is not a project but can be used to override the command(s) that will be performed on the projects in the all section, instead of performing the same command as the main project. The `skip` command has special meaning - it is used to skip a project that was defined in `all` from a specific command.

**Example:**

In this example if we execute `deploy build fullsystem`, this will perform
build on `base#images`, `ws1#1.1`, `ws2#1.2`, `ws3#1.3` and `ws4#master`. And
if we perform run this will perform `build` and `run` on the same projects.
Performing clean will skip the project `base#images`. One can use the `list`
command with `-deps` or test with `-dry` to test dependencies.

```yaml
projects:
  fullsystem#master:
    deps:
      all:
        - base#images
        - services
        - suppliers
      run:
        all: build, run
      clean:
        base#images: skip

  services#master:
    deps:
      all:
        - ws1#1.1
        - ws2#1.2
        - ws3#1.3

  suppliers#master:
    deps:
      all:
        - ws4#master
```


##### Repo configuration
This configuration is mandatory for the [git commands](#git-commands). It is a
mapping where the key is the remote repository and the value is the local
directory where the remote will be synced. The mapping may contain multiple
repos, but the first one is considered a main one and will be used when
determining the branches for the project in some cases. The branch part of the
remote is optional for the main (the first) repository and if ommited it is
the same as if the variables `{branch}` is used, in otherwords the current
branch will be used. The host in the remote is given only with its name, e.g.
`github/Perennials/deploy`.

```yaml
repo:
  host/user/repo#branch:local_directory
```

##### Image configuration
Describes the Docker image(s) for this project. Can be a mapping or array of mappings.

```yaml
image:
  image: name:tag
  path: build_path
  file: build_file
  rocker: bool
  vars:
    ## Rockerfile template variables
```

The `image` will be used for the `build` and `push` actions. `path` and `file` will be used only for building.

Property | Value type | Description
---- | ---- | ----
`image.image` | string | **Mandatory.** Name and tag for the docker image of this project.
`image.path` | string | **Mandatory for `build`.** Build path for the Docker image. Can be local path or URL as accepted by [Docker build](https://docs.docker.com/reference/commandline/build/).
`image.file` | string | For specifying a custom `Dockerfile` or `Rockerfile` relative to the build path. The default is `Dockerfile` or `Rockerfile` if rocker is used.
`image.rocker` | bool | If to use rocker instead of docker for building the image. The default is `false`. This does not need to be specified explictly when a file is specified and it is named `Rockerfile`.
`image.vars` | mapping | A set of variables to be substituted inside the `Rockerfile` file according to the rules of [rocker](https://github.com/grammarly/rocker).

##### Pod configuration
Describes the container pod configuration for the project. In the current
implementation [rocker-compose](https://github.com/grammarly/rocker-compose)
is used to start and stop the pod of containers, therefore the pod is described
in a separate YAML file in the format accepted by rocker-compose.

```yaml
pod:
  path: pod_definition_path
  file: pod_definitnion_file
  vars:
    ## pod definition template variables
```

Property | Value type | Description
---- | ---- | ----
`pod.path` | string | **Mandatory.** Path to the pod definition file.
`pod.file` | string | For specifying a custom pod definition file relative to the build path. The default is `compose.yml`.
`pod.vars` | mapping | A set of variables to be substituted inside the pod definition file according to the rules of [rocker-compose](https://github.com/grammarly/rocker-compose).


#### Example
For more examples check the [examples folder](https://github.com/Perennials/deploy/tree/master/examples). Start with `local.yml` in each folder.
You can also check the [tutorial](#tutorial).

```yaml
ws2:
  ## sync only the master branch or two digit semver branches like 1.1
  branches: [ 'master', !!js/regexp '^\d+\.\d+$' ]
  extends: base
  repo:
    ### will sync from this repo   to this local directory
    github/Perennials/ws2:         '{project.local}'
  
  image:
    ### name of docker image
    image: perennial.custom.registry/{project}:{branch}
    ### path for building the image
    path: '{project.local}'
    ### Dockerfile relative to the path
    file: docker/Dockerfile

base:
  template: true
  vars:
    project.local: /apps/{project}/{branch}
```


Authors
-------
Borislav Peev (borislav.asdf at gmail dot com)
