FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Expose port for Vite dev server
EXPOSE 3000

# Using dev server for 'docker compose up' interactivity as requested by similar context usually, 
# but user just said 'run it'. 
# To ensure it binds to valid host in container:
CMD ["npm", "run", "dev", "--", "--host"]
