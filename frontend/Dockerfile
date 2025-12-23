FROM node:20-alpine

WORKDIR /app

COPY package.json /app/package.json

RUN npm install --quiet

COPY . /app

EXPOSE 3005

CMD ["npm", "run", "dev"]


