FROM node:4.0
MAINTAINER Borislav Peev (borislav.asdf at gmail dot com)

RUN curl -SL https://github.com/grammarly/rocker-compose/releases/download/0.1.0/rocker-compose-0.1.0_linux_amd64.tar.gz | \
    tar -xjC /usr/local/bin && \
    chmod +x /usr/local/bin/rocker-compose

COPY . /app

WORKDIR /app

RUN npm install

VOLUME /app/config
VOLUME /app/log

# predefined known_hosts for github and bitbucket
RUN mkdir -p /root/.ssh
COPY docker/known_hosts /root/.ssh/

COPY docker/deploy.sh /

EXPOSE 80

CMD [ "/deploy.sh" ]