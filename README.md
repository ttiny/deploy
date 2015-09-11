Deploy
======
A Node.js tool for git and Docker deployments.

The tool performs three functions (not necessarily all of them):

1. [Synchronizes](#git-commands) local git repositori(es), possibly triggered
   by a [webhook](#rest-usage).
2. [Builds](#docker-commands) Docker images and pushes them to a Docker
   registry.
3. [Runs](#pod-commands) Docker container pods (currently with
   [rocker-compose](https://github.com/grammarly/rocker-compose)).

**deploy** is meant to be used in an dev-staging-production environment, where
the dev environment will sync application sources in response to git webhook.
From these sources Docker images would be built and and pushed to a registry
and finally the images can be deployed, without sources outside the containers
and staging and production.

All functionality is available via CLI or REST interface and the REST server
also handles webhooks. Currently the webhooks from GitHub are supported with
GitLab on the way.

<!-- MarkdownTOC -->

- [Installation](#installation)
- [Configuration](#configuration)
  - [HTTP configuration](#http-configuration)
  - [Git authentication](#git-authentication)
    - [Credentials configuration](#credentials-configuration)
      - [GitHub](#github)
  - [Project configuration](#project-configuration)
    - [Variables](#variables)
      - [Example](#example)
    - [Projects](#projects)
      - [Variables](#variables-1)
      - [Example](#example-1)
      - [Repo configuration](#repo-configuration)
      - [Docker configuration](#docker-configuration)
      - [Pod configuration](#pod-configuration)
  - [Examples](#examples)
- [CLI usage](#cli-usage)
  - [Project syntax](#project-syntax)
  - [Branch syntax](#branch-syntax)
  - [Examples](#examples-1)
  - [Git commands](#git-commands)
    - [Sync](#sync)
    - [Clean](#clean)
  - [Docker commands](#docker-commands)
    - [Build](#build)
    - [Push](#push)
  - [Remove images](#remove-images)
  - [Pod commands](#pod-commands)
    - [Run](#run)
    - [Stop](#stop)
- [REST usage](#rest-usage)
  - [REST syntax](#rest-syntax)
  - [Webhooks](#webhooks)
- [TODO](#todo)
- [Authors](#authors)

<!-- /MarkdownTOC -->


Installation
------------

You need Node.js >= 4.0.0. If you don't have it you don't need to install it system wide. You can just download the
archive, extract it somewhere and use the `node` and `npm` commands from the `bin` directory there.

1. Download the contents of this repo either from the zip button or from the releases section.
2. Extract somewhere, open a shell and cd to that directory.
3. Start `npm install` to install all dependencies in the current directory.
4. Now you can start the app with `node deploy.js` or the `deploy` shell script.

Make sure you have git, docker and rocker-compose installed, so **deploy** can start them!


Configuration
-------------
The configuration is read from `config.yml` and optionally merged with `config/local.yaml`.

The project configuration is in flexible YAML format provided by
[js-yaml](https://github.com/nodeca/js-yaml). The pod definitions are in YAML
pre-parsed as [Markup.js](https://github.com/adammark/Markup.js) template,
which is then fed to [rocker-compose](https://github.com/grammarly/rocker-compose).

Besides the custom elements provided by [js-yaml](https://github.com/nodeca/js-yaml),
which enable specifying JavaScript regular expressions and functions inside the configuration,
**deploy** has several custom types of itself. All of these can be used anywhere and will
be evaluated only when they are need. For example using a `!!js/function` for the value of
a variable, will evaluate the function only when the variable need to be substituted in a
give context. The custom types provided by **deploy** are:

Property | Description
---- | ----
`!cmd command` | Will execute a command and use its output as a value.
`!yamlfile file` | Will parse a YAML file and incorporate its contents in the document.
`!textfile file` | Will read a file as a plain text and use it as a value.


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

Additionally, to be able to perform bulk commands, that is commands on multiple
projects or branches, **deploy** will try to use the web APIs to determine the
available repositories and/or branches. For this to work `credentials` configuration
must be supplied.

#### Credentials configuration
It is not mandatory, but without it you will not be able to execute commands like `deploy sync "*"" "*"`.

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
`credentials.github.user` | Replace `user` with the actual GitHub user or organisation who's repositories these credentials will grant access to. It does not need to be the same as the `username`. Case sensitive, must match the repo configuration, e.g. for repo `github/Perennials/deploy` the user here should be `Perennials`.


### Project configuration
There are two sections in the root of the config file related to the project configuration.

#### Variables
Just a list of global variables that can be reused elsewhere in the
configuration. To use the variable use the `{variable_name}` syntax anywhere.
Variables will be resolved when they are actually used, not at the time of
loading the config. If a variable is used as sole value of some node, it
should be quoted to disambiguate the YAML mapping syntax.

```yaml
vars:
  name: value
```

The following global variables will be predefined.

Variable | Description
---- | ----
`{deploy.root}` | The root directory where the application itself resides.


##### Example
```yaml
vars:
  env: dev
  apps.root: /{env}/apps/
  username: !cmd id -u -n
```

#### Projects
Projects are described in the `project` root node. Projects can be reused as
templates. All project sub-configuration is optional.

```yaml
projects:
  name:
    extends: other_project
    template: true
    branches:
      # enabled branches for the project
    vars:
      # project specific variables
    repo:
      # pod configuration for the project
    docker:
      # pod configuration for the project
    pod:
      # pod configuration for the project
```

Property | Value type | Description
---- | ---- | ----
`projects.name` | string | `name` here is the actual name of the project.
`projects.name.extends` | string | A template to use for the base of this project. The properties of this project will be merged recursively with the template.
`projects.name.template` | `true` | Indicates the project is a template to be used for base of other projects and should be excluded of normal project treatment.
`projects.name.branches` | string\|string[] | Enabled branches for the project. You can specify one or multiple branches. Commands on branches outside of this list will be ignored. The default is `*`, which means all branches are enabled. The [js-yaml](https://github.com/nodeca/js-yaml) `!!js/regexp` custom type can be used here.
`projects.name.vars` | mapping | A list of project specific variables. The same as in the root section but all names will be prefixed with `project.` and will only be available in the context of the project, not globally.
`projects.name.repo` | mapping | Repo configuration for the project. [See bellow](#repo-configuration).
`projects.name.docker` | mapping\|mapping[] | Docker configuration for the project. [See bellow](#docker-configuration).
`projects.name.pod` | mapping | Pod configuration for the project. [See bellow](#pod-configuration).

###### Variables

Besides the global variables defined in the root of the configuration, the following variables will available in the scope of the project.

Variable | Description
---- | ----
`{project}` | Name of the current project.
`{branch}` | Name of the current branch.
`{branch.tag}` | Name of the current branch according to Docker's convention. Put simply this will be `latest` for branch named `master`, otherwise will be the same as `{branch}`.
`{branch.flat}` | Name of the current branch with all non-word and non-digit characters removed. E.g. for branch `1.1` this will be `11`.

###### Example

```yaml
ws2:
  ## sync only the master branch or two digit semver branches like 1.1
  branches: [ 'master', !!js/regexp '^\d+\.\d+$' ]
  extends: base
  repo:
    ### will sync from this repo
    remote: github/Perennials/ws2
    ### to this local directory
    local: '{project.local}'
  
  docker:
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

##### Repo configuration
This configuration is mandatory for the [git commands](#git-commands).

```yaml
repo:
  vars:
    ## repo specific variables
  remote: host/user/repo
  local: local_directory
  submodules:
    host/user/repo#branch:local_directory
```

Property | Value type | Description
---- | ---- | ----
`repo.remote` | string | **Mandatory.** Remote repository. The host is given only with its name, e.g. `github/Perennials/deploy`.
`repo.local` | string | **Mandatory.** Local directory where the remote will be synced.
`repo.vars` | mapping | A list of repo specific variables. The same as in the root section but all names will be prefixed with `repo.` and will only be available in the context of the repo, not globally.
`repo.submodules` | mapping | Related repositories to be synced after the main one. The term "submodule" here does not refer to the git term submodule. It is only a mean to sync related dependencies of the main project repo, without using real submodules.

##### Docker configuration
Describes the Docker image(s) for this project. Can be a mapping or array of mappings.

```yaml
docker:
  image: name:tag
  path: build_path
  file: build_file
```

The `image` will be used for the `build` and `push` actions. `path` and `file` will be used only for building.

Property | Value type | Description
---- | ---- | ----
`docker.image` | string | **Mandatory.** Name and tag for the docker image of this project.
`docker.path` | string | **Mandatory for `build`.** Build path for the Docker image. Can be local path or URL as accepted by [Docker build](https://docs.docker.com/reference/commandline/build/).
`docker.file` | string | For specifying a custom `Dockerfile` relative to the build path. The default is `Dockerfile`.

##### Pod configuration
Describes the container pod configuration for the project. In the current
implementation [rocker-compose](https://github.com/grammarly/rocker-compose)
is used to start and stop the pod of containers, therefore the pod is described
in a separate YAML file in the format accepted by rocker-compose. The file is
preprocessed as [Markup.js](https://github.com/adammark/Markup.js) template,
therefore rocker-compose templates should not be used.

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
`pod.vars` | mapping | A set of variables to be substituted inside the pod definition file according to the rules of [Markup.js](https://github.com/adammark/Markup.js).


### Examples

Check the [examples folder](https://github.com/Perennials/deploy/tree/master/examples). Check `local.yml` in each folder.


CLI usage
---------

The CLI syntax is to pass one or more commands to be performed on a given
project and given branch. Multiple commands are performed in the same order
and are separated with commas, without space.

```sh
deploy <command[,command]...> <project> <branch>
```

#### Project syntax
The project can be given as literal name, which should match the one in the configuration, as repository or as `*`.

The repository syntax is `repo:host/user/repo`. For example
`repo:github/Perennials/deploy`. Passing a repository for the project will
perform the command on all projects related to this repository. Notice the host
is not `github.com` but just lowercase `github`. This is the format used
everywhere throughout the configuration.

Passing `*` will will perform the command on all projects.

**Remark:** Using `*` for a project is connected to the `credentials`
configuration. **deploy** will use the credentials from the config to find all
available repositories and then find all related projects for each repository.
`*` can not be used without proper `credentials` configuration (except for
public repos).


#### Branch syntax
The branch can be given as as literal name or `*`.

Passing `*` will perform the command on all enabled branches.

**Remark:** Using `*` for a branch is connected to the `repo` configuration of
the project. **deploy** will use the credentials from the config to find all
remote branches. `*` can not be used on a project without `repo` configuration
or without proper `credentials` configuration for the give `repo` (except for
public repos).

#### Examples

```sh
deploy sync myproject master
```

```sh
deploy clean,sync myproject "*"
```

```sh
deploy sync repo:github/Perennials/deploy master
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

**!!! Warning:** all local changes and conflicts will be discarded **without backup or confirmation.** 

```sh
deploy sync <project> <branch>
```

#### Clean
The command will remove all local repositories for the project **without backup or confirmation.**
If the `-rmi` flag is passed it will also remove the Docker images.

```sh
deploy clean <project> <branch> [-rmi [-force]]
```


### Docker commands
Docker commands can be performed only on projects with [docker configuration](#docker-configuration)

#### Build
The command will build the Docker image(s) for the specified project and branch.

```sh
deploy build <project> <branch>
```

#### Push
The command will push the Docker image(s) for the specified project and branch.

```sh
deploy push <project> <branch>
```

### Remove images
The command will remove the Docker image(s) for the specified project and branch.

```sh
deploy rmi <project> <branch> [-force]
```


### Pod commands
Pod commands can be performed only on projects with [pod configuration](#pod-configuration).

#### Run
The command will run the Docker container(s) pod for the specified project and branch.
All non-existing host directories that are to be bound as container volumes will be
created prior to launching the pod.

```sh
deploy run <project> <branch>
```

#### Stop
The command will run the Docker container(s) pod for the specified project and branch.

```sh
deploy stop <project> <branch>
```


REST usage
----------

Starting the script without arguments will create an HTTP server according to the
configuration and listen for REST requests or webhooks.

```sh
deploy
```

### REST syntax

```
http://myserver.com/<action>[/project[/branch]][?secret-access]
```

The syntax for `action`, `project` and `branch` is the same in the CLI interface, with the
addition of the `deploy` action which has special purpose for webhooks. `secret-access` may
be used if it is allowed in the configuration.

```
http://myserver.com/sync/myproject/master
```

```
http://myserver.com/clean,sync/myproject/*
```

### Webhooks

Use URL like this for the webhook configuration:

```
http://myserver.com/deploy
```

Just pass any REST URL as webhook. This is actually the REST URL for the
`deploy` command. The `deploy` command means to detect the command from the
webhook payload. In other words it will perform either `sync` or `clean`
depending if you push something in the branch or delete the branch.

With this syntax the project and the branch will also be auto detected from
the webhook payload.

Otherwise you can force specific action or specific project and/or branch. If
the project or the branch is omitted it will be auto detected from the
payload. For example:

```
http://myserver.com/sync/myproject/master
```


TODO
----

- GitLab support <https://gitlab.com/gitlab-org/gitlab-ce/blob/master/doc/web_hooks/web_hooks.md>.
- BitBucket support <https://bitbucket.org/atlassian/bitbucketjs>.
- Mail on errors.
- Be able to do things for projects/repos like events: pre-sync, post-sync,
  pre-clone, post-clone, pre-clean, post-clone, error, success, or something
  of this sort.
- `*` for project or branch will not work without `repo` configuration. This
  means it can not be used for `docker` or `pod` without `repo`.
- Would be nice to be able to configure the path to rocker-compose.
- Add install instructions for running from Docker.


Authors
-------
Borislav Peev (borislav.asdf at gmail dot com)
