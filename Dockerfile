# Dev-oriented image. For a production build use a multi-stage `next build` instead.
FROM node:22-alpine

WORKDIR /app

# Install deps first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm install

# Generate the Prisma client (schema is needed at this point).
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the source (overlaid by the bind-mount in docker-compose).
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
