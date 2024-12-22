FROM node:21-alpine3.19

# Establecer el directorio de trabajo
WORKDIR /usr/src/app

# Instalar dependencias del sistema (curl, bash, y dockerize)
RUN apk update && apk add --no-cache \
    curl \
    bash \
  && curl -sSL https://github.com/jwilder/dockerize/releases/download/v0.6.1/dockerize-linux-amd64-v0.6.1.tar.gz | tar -xzv \
  && mv dockerize /usr/local/bin/

# Copiar archivos package.json y package-lock.json
COPY package.json ./ 
COPY package-lock.json ./

# Instalar dependencias de Node.js
RUN npm install

# Copiar todo el código fuente de la aplicación
COPY . .

# Exponer el puerto 3002 (el puerto donde la app escucha)
EXPOSE 3003

# Comando para esperar a que NATS esté disponible y luego iniciar la aplicación
CMD ["dockerize", "-wait", "tcp://nats-server:4222", "-timeout", "60s", "npm", "run", "start:dev"]
