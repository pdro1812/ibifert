# ==========================================
# Fase 1: Build (Compilação do código)
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Usamos ci em vez de install para garantir versões exatas do package-lock
RUN npm ci 
COPY . .
# Isso vai gerar a pasta /app/dist (padrão do Vite)
RUN npm run build 

# ==========================================
# Fase 2: Produção (Servidor Web Nginx)
# ==========================================
FROM nginx:alpine
# Remove a página padrão do Nginx
RUN rm -rf /usr/share/nginx/html/*
# Copia apenas os arquivos compilados da Fase 1 para o Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Exposição da porta (O Nginx roda na 80 por padrão)
EXPOSE 80

# Inicia o Nginx
CMD ["nginx", "-g", "daemon off;"]