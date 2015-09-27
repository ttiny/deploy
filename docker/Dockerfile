FROM node:4.1
MAINTAINER Borislav Peev (borislav.asdf at gmail dot com)

# this is neede to install docker from https
RUN apt-get update && \
    apt-get install apt-transport-https -y

# install docker which will use the host docker socket
RUN apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D
RUN echo "deb https://apt.dockerproject.org/repo debian-jessie main" >> /etc/apt/sources.list && \
    apt-get update && \
    apt-get install docker-engine -y


# predefined known_hosts for github and bitbucket
RUN mkdir -p /root/.ssh
COPY docker/known_hosts /root/.ssh/
COPY docker/deploy.sh /deploy

# copy the app files
COPY . /app

# install our local rocker-compose copy
RUN tar -xzC /usr/local/bin -f /app/thirdparty/rocker-compose/rocker-compose-*linux*.tar.gz && \
    chmod +x /usr/local/bin/rocker-compose

# install our local rocker copy
RUN tar -xzC /usr/local/bin -f /app/thirdparty/rocker/rocker-*linux*.tar.gz && \
    chmod +x /usr/local/bin/rocker

# clean unneeded stuff
RUN rm -rf /app/docker /app/thirdparty
RUN ln -sf /deploy /usr/local/bin/deploy

EXPOSE 80

WORKDIR /app
CMD [ "/deploy" ]