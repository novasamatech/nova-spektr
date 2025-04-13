FROM oven/bun:1.2

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

CMD ["bun", "run", "start:renderer", "--host", "0.0.0.0"]
