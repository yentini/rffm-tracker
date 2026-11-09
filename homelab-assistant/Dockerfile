FROM node:20-alpine

WORKDIR /app

# Install native dependencies if needed
RUN apk add --no-cache curl tzdata

ENV NODE_ENV=production \
    PORT=3005 \
    AUTH_DIR=/app/auth_info

COPY package*.json ./

RUN npm install --omit=dev

COPY src ./src

EXPOSE 3005

VOLUME ["/app/auth_info"]

CMD ["node", "src/index.js"]
