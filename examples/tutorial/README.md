Deploy baby step tutorial
=========================
This tutorial goes though the whole app deployment lifecycle. It goes through
the steps but doesn't elaborate very much on each step, its purpose is to show
the whole picture. One should seek additional information elsewhere. Basic
knowledge of Docker and related is assumed. If you need help with that refer
to the official Docker tutorials.

<!-- MarkdownTOC -->

- [Creating the application](#creating-the-application)
- [Creating a docker image](#creating-a-docker-image)
- [Setting up **deploy** config for the application](#setting-up-deploy-config-for-the-application)
- [Setting up **deploy**](#setting-up-deploy)
  - [As Docker image](#as-docker-image)
  - [Native installation](#native-installation)
- [Syncing with **deploy**](#syncing-with-deploy)
  - [Manually](#manually)
  - [With webhooks](#with-webhooks)
- [Building a Docker image with **deploy**](#building-a-docker-image-with-deploy)
- [Running with **deploy**](#running-with-deploy)
- [Pushing with **deploy**](#pushing-with-deploy)
- [Cleaning up with **deploy**](#cleaning-up-with-deploy)
- [Authors](#authors)

<!-- /MarkdownTOC -->


Creating the application
------------------------
We will use GitHub directly.

1. Create a personal account in GitHub if you don't have one, it will be used
   later for the webhooks too.

   ![Create GitHub account](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/create-1.png)

2. Create a new repository in your account.

  ![Create GitHub repo](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/create-2.png)

  ![Create GitHub repo](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/create-3.png)

3. Create a new application. Our application will make a whale say something.
   Create a new file named `myscript.sh` and enter this script in it:

   ```sh
   #!/bin/bash
   cowsay boo
   ```

   ![Create GitHub file](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/create-4.png)

   ![Create GitHub file](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/create-5.png)

4. Commit the file.

   ![Commit GitHub file](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/create-6.png)

5. Cool, now we have an application. We can't test it as it is because it
   depends on the cowsay thing, which we will install via Docker.

Creating a docker image
-----------------------

1. In our repo create a new file called Dockerfile and enter this script in it
   and commit. This makes a Docker image derived from the image
   `docker/whalesay`, which has the `cowsay` app that we depend on.

   ```dockerfile
   FROM docker/whalesay
   COPY myscript.sh /
   CMD sh /myscript.sh
   ```

   ![Dockerfile](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/dockerfile-1.png)


Setting up **deploy** config for the application
------------------------------------------------

Now lets make a **deploy** config for our application. Create a file called
`deploy.config.yml` somewhere. Normally you would put the config in
`deploy/config/local.yml`, but here we make separate file for the tutorial.

A **deploy** project configuration consists of three independent sections.

1. `repo` section which is used for git commands like `sync` and `clean`. Here
   we describe which repositories to sync and where to sync them. We need this
   section if we want to sync in response of webhooks.
2. `image` section which is used for Docker commands like `build` and `push`
   and `rmi`. This is where we describe what image we are building and from
   where.
3. `pod` section which is used for the `run` and `stop` commands. Here we
   describe the container pod used to run the project. Right now it is a
   rocker-compose pod definition, it may describe one or more containers that
   run together.


Lets show the config step by step:

1. Setup our project. Lets declare the path of the project as a variable because
   we will be using it often. The image name will be used later when we build
   and push a Docker image. The `bobi` in this name refers to my Docker Hub
   username and should be changed accordingly, and the path too of course. I
   override the default HTTP port here, this is used when we receive webhooks.
   We declare which branches we are going to use. **Deploy** is able to detect
   the branches of your projects from GitHub, if you supply it with
   credentials. To simplify the configuration here I declare the branch so
   **deploy** can use this information if it is unable to get the list of
   branches from the GitHub API. This will also prevent other branches from
   being synced, if, for example, we receive a webhook for push in another
   branch.

  ```yaml
  http:
    port: 1337

  projects:
    deploy-tutorial:
      branches: master

      vars:
        project.local: /Users/bobi/Downloads/deploy-tutorial
        project.image: bobi/whalesay
  ```

2. Add configuration of the repository. Notice how we spell the repo. We just
   place `github/`, no `.com` or anything. The right side of the repo is the
   local directory where it will be synced. This configuration is used for git syncing.

  ```yaml
  projects:
    deploy-tutorial:
      repo:
        github/bobef/deploy-tutorial: ${project.local}
  ```

3. Now lets add Docker configuration for the project. This will be used when
   building and and pushing a Docker image. Path here is where the
   `Dockerfile` is, the same directory where we sync our project.
   Alternatively we could place a git URL for the path, because Docker can
   build directly from git. But building locally allows us to test and adjust
   things and not have to push broken, untested things to git.

  ```yaml
  projects:
    deploy-tutorial:
      image:
        image: ${project.image}:{branch}
        path: ${project.local}
  ```

4. Finally lets create a pod configuration. First add the pod to the config.
   Notice the vars section here. It is different from the project vars section
   \- these are vars for the pod template. So we pass the image and branch
   names forward.

  ```yaml
  projects:
    deploy-tutorial:
      pod:
        path: ${project.local}
        file: whalesay.pod.yml
        vars:
          image: ${project.image}
          branch: ${branch}
  ```

  Then create the pod itself. The pod is a rocker-compose YAML file. In this
  example a very simple one. We can create this one in our git repo also.

  ```yaml
  namespace: whalesay
  containers:
    app:
      image: {{.image}}:{{.branch}}
      restart: never
  ```

  ![Pod definition](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/config-1.png)

  Finally our `deploy.config.yml` should look like this:

  ```yaml
  http:
    port: 1337

  projects:
    deploy-tutorial:
      branches: master

      vars:
        project.local: /Users/bobi/Downloads/deploy-tutorial
        project.image: bobi/whalesay

      repo:
        github/bobef/deploy-tutorial: ${project.local}

      image:
        image: ${project.image}:{branch}
        path: ${project.local}

      pod:
        path: ${project.local}
        file: whalesay.pod.yml
        vars:
          image: ${project.image}
          branch: ${branch}
  ```


Setting up **deploy**
---------------------

We will show two ways of using **deploy**. Natively installed and as Docker
image. Choose whichever suits you better.

### As Docker image

This is the proffered way of using **deploy** because we don't need to deal
with any dependencies. We only need Docker. Lets create a shortcut script
because Docker CLI commands are quite lengthy. On Unix based system make a
`deploy.sh` and put this inside, replacing the paths with your actual ones.

1. Create our shortcut script, replacing the paths with your actual paths.
   What happens here is we share our Docker config and SSH config from the host
   with the **deploy** Docker container. We also share the directory where
   we store our projects and configs. This is one way to do it. Another way,
   described in **deploy**'s docs, is placing the SSH key and the config in
   a directory and binding it to `/app/config` inside the container. We still
   need to share the Docker config from our user directory if we want to
   push, because Docker needs login.

   ```sh
   #!/bin/bash
   docker run --rm -ti \
               -p 1337:1337 \
               -v /Users/bobi/Downloads:/Users/bobi/Downloads \
               -v /Users/bobi/.docker:/root/.docker \
               -v /Users/bobi/.ssh:/root/.ssh \
               -v /var/run/docker.sock:/var/run/docker.sock \
               perennial/deploy:master \
               deploy "$@" --config /Users/bobi/Downloads/deploy.config.yml
   ```

   Then make it executable:

   ```sh
   chmod +x deploy.sh
   ```

2. Test our script.

   ```sh
   ./deploy.sh --var debug=true
   ```

   We should get output like this. Deploy will print the global variables and terminate because other parameters are not given.
   ```
   Vars: 
   -----
   deploy.root = /app
   debug = true
   ^^^^^
   deploy <action[,action]..> <project[#branch]>.. [OPTIONS]..
   ```


### Native installation
First we need git and
[rocker-compose](https://github.com/grammarly/rocker-compose#installation). I
don't want to explain how to install git here, if you don't have it, you
probably don't need to sync git repos. rocker-compose can be
[downloaded](https://github.com/grammarly/rocker-compose/releases) as binary.
Just extract it and put it in your path. The tested version in this tutorial
is `0.1.1`.

1. Deploy depends on node.js, until I have the time to pack it neatly and
   distribute it as a single binary. So
   [download](https://nodejs.org/en/download/) the node archive for your
   OS. At least node '4.0.0'.
2. Extract it somewhere, e.g. `/Users/bobi/Downloads/node-v4.1.0-darwin-x64`.
3. [Download](https://github.com/Perennials/deploy/archive/master.zip) deploy
   and extract somewhere.
4. Lets create a small shortcut script for **deploy**. On Unix based system
   make a `deploy.sh` and put this inside, replacing the paths with your
   actual ones. We pass the `--config` argument to make **deploy** always use
   our config, or we could just place the config as `config/local.yml` inside
   **deploy**'s folder.

   ```sh
   #!/bin/bash
   #                                                   # #                                           #  #                                                  #
   ################  path to node  ##################### ############  path to deploy  ###############  ########  additional arguments for deploy  #########
   #                                                   # #                                           #  #                                                  #
   
   /Users/bobi/Downloads/node-v4.1.0-darwin-x64/bin/node /Users/bobi/Downloads/deploy-master/deploy.js "$@" --config /Users/bobi/Downloads/deploy.config.yml
   ```

  Then make it executable:
  ```sh
  chmod +x deploy.sh
  ```

   On Windows the script (`deploy.bat`) would look something like this (untested):

   ```batch
   @echo off
   C:\Path\To\node C:\Users\bobi\Downloads\deploy-master\deploy.js %* --config C:\Users\bobi\Downloads\deploy.config.yml
   ```

5. Test our script.

   ```sh
   ./deploy.sh --var debug=true
   ```

   We should get output like this. Deploy will print the global variables and terminate because other parameters are not given.
   ```
   Vars: 
   -----
   deploy.root = /Users/bobi/Downloads/deploy-master
   debug = true
   ^^^^^
   deploy <action[,action]..> <project[#branch]>.. [OPTIONS]..
   ```


Syncing with **deploy**
-----------------------

### Manually

Use the script we have prepared in the previous step. We just tell deploy to
sync the project deploy-tutorial and branch master. That's all. From where and
to where to sync is read from the config file we already created.

```sh
./deploy.sh sync deploy-tutorial
```

We should get output like this:

```
Syncing project deploy-tutorial branch master ...
==========
Local repo directory is /Users/bobi/Downloads/deploy-tutorial
git clone --recursive --branch master git@github.com:bobef/deploy-tutorial.git /Users/bobi/Downloads/deploy-tutorial


Cloning into '/Users/bobi/Downloads/deploy-tutorial'...

All good.
```

### With webhooks

For this to work you will need to run deploy somewhere where it is accessible from the Internet.

1. Run **deploy** without any arguments. This will start a web server and listen for hooks.

   ```sh
   ./deploy.sh
   ```

   We should see this message:

   ```
   Listening on 0.0.0.0:1337 ...
   ```

2. Now we need to set GitHub to send notifications to our **deploy**. Go to the repo settings about webhooks.

   ![Add GitHub webhook](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/webhook-1.png)

   ![Add GitHub webhook](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/webhook-2.png)

   ![Add GitHub webhook](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/webhook-3.png)

   Add a webhook with the URL of your server. The meaning of `/deploy` is explained in **deploy**'s docs. This is the
   default, but you can change it. The port is the one you configure or if you use the default 80, you don't need to
   enter a port.

   ![Add GitHub webhook](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/webhook-4.png)

   Save the hook.

   ![Save GitHub webhook](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/webhook-5.png)

   GitHub will send a ping to the hook. **Deploy** doesn't care about pings, only about pushes, so you will get error
   message in the output of the server.

   ```
   (1) Incoming request 192.30.252.34 2015-09-22T13:39:13.619Z .
   (1) Unable to handle payload.
   ```

3. Lets modify one file in the repo so GitHub will send a push notification. Lets edit `myscript.sh` and change what
   the whale is saying from `boo` to `moo`.

   ![Cause GitHub webhook](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/webhook-6.png)

   Now in the output of the server we should see a successful request.

   ```
   (2) Incoming request 192.30.252.42 2015-09-22T14:01:42.645Z .
   (2) Identified as github payload.
   (2) Spawning deploy sync repo:github/bobef/deploy-tutorial master --config /Users/bobi/Downloads/deploy.config.yml
   (2) All good.
   ```

   And if we go back to the repo's webhook settings, we should see in the output of **deploy** that it ran a sync and
   updated the file `myscript.sh`.

   ![Check GitHub webhook](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/webhook-7.png)


Building a Docker image with **deploy**
---------------------------------------

Start the build command. If you are running Docker on OSX or Windows, start
this from the Docker terminal, or modify your deploy shortcut script so it
will set some Docker environment variables.

```sh
./deploy.sh build deploy-tutorial
```

And the output should look similar to this:

```
Building project deploy-tutorial branch master ...
==========
docker build --force-rm -t bobi/whalesay:master .
Sending build context to Docker daemon 52.22 kB
Step 0 : FROM docker/whalesay
 ---> fb434121fc77
Step 1 : COPY myscript.sh /
 ---> 35dc128dd143
Removing intermediate container f6afbc498e6b
Step 2 : CMD sh /myscript.sh
 ---> Running in 74a796450340
 ---> 4828b20471bf
Removing intermediate container 74a796450340
Successfully built 4828b20471bf
All good.
```

Running with **deploy**
-----------------------

Once we have built the image we can run it or push it. If you are running
Docker on OSX or Windows, start this from the Docker terminal, or modify your
deploy shortcut script so it will set some Docker environment variables.

Start the run command:

```sh
./deploy.sh run deploy-tutorial
```

It is using rocker-compose to run our pod in the background. So we won't see
the output of the program directly.

```
Runing project deploy-tutorial branch master ...
==========
Using pod definition /Users/bobi/Downloads/deploy-tutorial/whalesay.pod.yml.
rocker-compose run -f -
INFO[0000] Reading manifest from STDIN                  
INFO[0000] Create container whalesay.app                
INFO[0000] Starting container whalesay.app id:36272c4751ed from image bobi/whalesay:master 
INFO[0000] Waiting for 1s to ensure whalesay.app not exited abnormally... 
INFO[0001] OK, containers are running: whalesay.app     
All good.
```

We can check the logs.

```sh
docker logs whalesay.app
```

And see our whale talking.

```
 _____ 
< boo >
 ----- 
    \
     \
      \     
                    ##        .            
              ## ## ##       ==            
           ## ## ## ##      ===            
       /""""""""""""""""___/ ===        
  ~~~ {~~ ~~~~ ~~~ ~~~~ ~~ ~ /  ===- ~~~   
       \______ o          __/            
        \    \        __/             
          \____\______/   
```


Pushing with **deploy**
-----------------------

Once we have built the image we can push it to some registry. We will use the
public Docker Hub for this purpose. If you are running Docker on OSX or
Windows, start the commands bellow from the Docker terminal, or modify your
deploy shortcut script so it will set some Docker environment variables.

1. Register for a free account on Docker Hub.

   ![Register Docker Hub](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/push-1.png)

2. Once you login and confirm your email you can create a new repository. This is where our image will be pushed.

   ![Create Docker Hub repo](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/push-2.png)

   The details here should match our **deploy** config we created earlier.

   ![Create Docker Hub repo](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/push-3.png)

   ![Create Docker Hub repo](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/push-4.png)

3. Before we can push we need to login with the Docker client. Start this
   command and it will prompt you for your credentials.

   ```sh
   docker login
   ```

4. Finally push with deploy.

   ```sh
   ./deploy.sh push deploy-tutorial
   ```

   The output should look similar to this:

   ```
   Pushing project deploy-tutorial branch master ...
   ==========
   docker push bobi/whalesay:master
   The push refers to a repository [docker.io/bobi/whalesay] (len: 1)
   4828b20471bf: Image successfully pushed 
   35dc128dd143: Image successfully pushed 
   fb434121fc77: Image already exists 
   5d5bd9951e26: Image successfully pushed 
   99da72cfe067: Image successfully pushed 
   1722f41ddcb5: Image already exists 
   5b74edbcaa5b: Image successfully pushed 
   676c4a1897e6: Image successfully pushed 
   07f8e8c5e660: Image already exists 
   37bea4ee0c81: Image successfully pushed 
   a82efea989f9: Image successfully pushed 
   e9e06b06e14c: Image successfully pushed 
   master: digest: sha256:519e0f8a645657df080320157e2dcc0537dea0dbf9a92f49aa6699478678d5ca size: 22081
   All good.
   ```

   And we should have our image up in Docker Hub. Now this image can be downloaded by others.

   ![Push Docker Hub](https://raw.github.com/Perennials/deploy/master/examples/tutorial/screenshots/push-5.png)


Cleaning up with **deploy**
---------------------------

Here we perform two tasks - `clean` (aka delete) the local repo directory and
remove the Docker image (`rmi`). Since the image is in use by the stopped
container from our last run, we also pass the `-force` flag.

If you are running Docker on OSX or Windows, start this from the Docker
terminal, or modify your deploy shortcut script so it will set some Docker
environment variables.

```sh
./deploy.sh clean,rmi deploy-tutorial -force
```

The output will look similar to this.

```
Cleaning project deploy-tutorial branch master ...
==========
Using pod definition /Users/bobi/Downloads/deploy-tutorial/whalesay.pod.yml.
rocker-compose clean -f -
INFO[0000] Reading manifest from STDIN                  
Removing /Users/bobi/Downloads/deploy-tutorial ...
docker rmi -f bobi/whalesay:master
Untagged: bobi/whalesay:master
Deleted: 07db1c937baa0b92c51898c00b581eb22d3abe56586dd1370ce94fb69e061b26
Deleted: bd677345681ffd1112dff0c36a28f0dab0b0194a307339c31da983043455fcea
All good.
```

Authors
-------
Borislav Peev (borislav.asdf at gmail dot com)
