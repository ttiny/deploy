This is Docker image for <https://github.com/Perennials/deploy>. It is
bundled for usage with github.com and bitbucket.org, it only needs a config
and a optionally a private key.

```sh
### from the root of the deploy folder
docker build -t perennial/deploy:master -f docker/Dockerfile .
```


Projects directory
------------------

There should be some directory where the git syncing will take place. Usualy it
will be mounted from the host OS.



Volumes
-------

### Config
- The config file `local.yml` will be loaded from the config volume.
- The SSH key `id_rsa` will be added to the SSH agent, if it is found in the config volume.

```
/app/config
```


Authors
-------
Borislav Peev (borislav.asdf at gmail dot com)