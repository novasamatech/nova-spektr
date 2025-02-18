FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install -g pnpm
RUN pnpm install

COPY . .

CMD [ "pnpm", "start:renderer", "--host", "0.0.0.0" ]
