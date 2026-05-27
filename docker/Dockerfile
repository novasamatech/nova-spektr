FROM node:24
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && \
    corepack prepare pnpm@10 --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY .papi ./.papi/

RUN pnpm install --frozen-lockfile

COPY . .

CMD [ "pnpm", "start:renderer", "--host", "0.0.0.0" ]
