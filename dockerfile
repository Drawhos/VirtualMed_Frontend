FROM node:20-alpine AS build
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:5045/api
ARG NEXT_PUBLIC_WS_URL=ws://localhost:5045/hubs/video-chat
ARG NEXT_PUBLIC_AI_URL=http://localhost:8000

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_AI_URL=$NEXT_PUBLIC_AI_URL

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
# Next.js App Router puede no tener public/; Docker COPY falla si no existe
RUN mkdir -p public
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "start"]
