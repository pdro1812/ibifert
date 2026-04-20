FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
# Não precisamos do COPY . . aqui porque usaremos volumes no docker-compose
EXPOSE 5173
CMD ["npm", "run", "dev"]