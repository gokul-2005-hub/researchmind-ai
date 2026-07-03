# Stage 1: Build compilation
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency catalogs
COPY package.json package-lock.json ./

# Install packages
RUN npm ci

# Copy client source code
COPY . .

# Compile production bundle
RUN npm run build

# Stage 2: Host web server
FROM nginx:alpine

# Copy compiled SPA static assets to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration mapping SPA route fallbacks
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
