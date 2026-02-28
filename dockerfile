# Build
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# Production
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app ./
CMD ["npm", "start"]