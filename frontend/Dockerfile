FROM node:20-alpine

WORKDIR /app

# Copia os arquivos de dependência e instala
COPY package*.json ./
RUN npm install

# Copia o código
COPY . .

# Expõe a porta do Vite
EXPOSE 5173

# O comando de desenvolvimento!
CMD ["npm", "run", "dev"]