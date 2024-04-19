FROM node:18.17.1

EXPOSE 80

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "run", "start:server"]
