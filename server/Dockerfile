FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
RUN mkdir /data && chown node:node /data
USER node
ENV DATA_DIR=/data NODE_ENV=production
EXPOSE 4180
CMD ["node","src/start.js"]
