FROM node:24
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && \
    corepack prepare pnpm@11.4.0 --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .papi ./.papi/

RUN pnpm install --frozen-lockfile

COPY . .

CMD [ "pnpm", "start:renderer", "--host", "0.0.0.0" ]
