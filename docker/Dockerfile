FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install -g pnpm
RUN pnpm install
RUN pnpm install sucrase @babel/register esbuild-register @swc/register

COPY . .

CMD [ "pnpm", "start:renderer" ]
