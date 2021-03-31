FROM node:14.7.0-alpine

WORKDIR /usr/src/app

COPY package*.json bootstrap.sh ./

RUN apk upgrade --update-cache --available && \
	apk add openssl && \
	rm -rf /var/cache/apk/*

RUN npm run bootstrap && npm ci

COPY . .

RUN npm run build

CMD [ "bootstrap.sh", "node", "./dist/index.js" ]
