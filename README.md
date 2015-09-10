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
sync/<project>/<branch>
optional github/bitbucket payload
```


TODO
====

- BitBucket support <https://bitbucket.org/atlassian/bitbucketjs>.
- GitLab support <https://gitlab.com/gitlab-org/gitlab-ce/blob/master/doc/web_hooks/web_hooks.md>.
- Mail on errors.
- Be able to do things for projects/repos like events: pre-sync, post-sync, pre-clone, post-clone, pre-clean, post-clone, error, success.