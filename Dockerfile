FROM node:20-alpine

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY app.js .

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8080

CMD ["node", "app.js"]