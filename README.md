THIS IS WORK IN PROGRESS. It is like the
<https://github.com/Perennials/apache-git-sync-tool>, but extended so it can
help with deploying docker images too.


Scenarios
=========


```sh
dpl run <project> <branch>
```
- create volumes, if any
- rocker run


```sh
dpl stop <project> <branch>
```
- rocker rm


```sh
dpl sync <project> <branch>
```
- git sync, if any repos


```sh
dpl build <project> <branch>
```
- docker build, if any docker


```sh
dpl push <project> <branch>
```
- docker push, if any docker


```sh
dpl sync,build,stop,run <project> <branch>
```


REST
====

```
dpl/sync/<project>/<branch>/[/clean]
optional github/bitbucket payload
```
- if project is supplied and different from payload - ignore
- if branch is supplied and different from payload - ignore
- otherwise update all projects with matching repo


TODO
====

- BitBucket support <https://bitbucket.org/atlassian/bitbucketjs>.
- Consider webhook ips: <https://developer.github.com/v3/meta/>.
- Mail on errors.
- Be able to do things for projects/repos like events: pre-sync, post-sync, pre-clone, post-clone, pre-clean, post-clone, error, success.
- Be able to have repo.branches: [ 1, '2.0', !!js/regexp '1.2.\d+' ] which will allow only this branches to be synced.