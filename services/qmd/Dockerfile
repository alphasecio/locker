FROM node:22-slim

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY . .

ENV QMD_DATA_DIR=/data/qmd
ENV QMD_PORT=9600

EXPOSE 9600

VOLUME ["/data/qmd"]

CMD ["node", "--import", "tsx", "src/index.ts"]
