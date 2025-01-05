FROM node:22-bullseye
RUN mkdir -p /srv/app
WORKDIR /srv/app
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile --non-interactive

COPY . /srv/app
EXPOSE 8080
CMD [ "yarn", "start" ]
