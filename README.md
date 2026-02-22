## docker-compose.yml file
version: "3.8"

services:
  api-gateway:
    build: ./api-gateway
    restart: always # Добавь эту строку
    ports:
      - "4000:4000"
    #env_file: ./api-gateway/.env
    depends_on:
      - redis
      - rabbitmq

    environment:
      - REDIS_URL=${REDIS_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
      - PORT=${PORT}
      - NODE_ENV=${NODE_ENV}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - IDENTITY_SERVICE_URL=${IDENTITY_SERVICE_URL}
      - IDENTITY_SERVICE_PORT=${IDENTITY_SERVICE_PORT}
      - POST_SERVICE_URL=${POST_SERVICE_URL}
      - POST_SERVICE_PORT=${POST_SERVICE_PORT}
      - MEDIA_SERVICE_URL=${MEDIA_SERVICE_URL}
      - MEDIA_SERVICE_PORT=${MEDIA_SERVICE_PORT}
      - SEARCH_SERVICE_URL=${SEARCH_SERVICE_URL}
      - SEARCH_SERVICE_PORT=${SEARCH_SERVICE_PORT}
    networks:
      - microservices-net

  identity-service:
    build: ./identity-service
    restart: always # Добавь эту строку
    #env_file: ./identity-service/.env
    depends_on:
      - redis
      - rabbitmq
    environment:
      - REDIS_URL=${REDIS_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
      - IDENTITY_SERVICE_POR=${IDENTITY_SERVICE_PORT}
      - NODE_ENV=${NODE_ENV}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - MONGO_URI=${MONGO_URI}
    networks:
      - microservices-net

  post-service:
    build: ./post-service
    restart: always # Добавь эту строку
    #env_file: ./post-service/.env
    depends_on:
      - redis
      - rabbitmq
    environment:
      - REDIS_URL=${REDIS_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
      - POST_SERVICE_POR=${POST_SERVICE_PORT}
      - NODE_ENV=${NODE_ENV}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - MONGO_URI=${MONGO_URI}

    networks:
      - microservices-net

  media-service:
    build: ./media-service
    restart: always # Добавь эту строку
    #env_file: ./media-service/.env
    depends_on:
      - redis
      - rabbitmq
    environment:
      - REDIS_URL=${REDIS_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
      - MEDIA_SERVICE_PORT=${MEDIA_SERVICE_PORT}
      - NODE_ENV=${NODE_ENV}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - MONGO_URI=${MONGO_URI}
      - CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
      - CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
      - CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
    networks:
      - microservices-net

  search-service:
    build: ./search-service
    restart: always # Добавь эту строку
    #env_file: ./search-service/.env
    depends_on:
      - redis
      - rabbitmq
    environment:
      - REDIS_URL=${REDIS_URL}
      - RABBITMQ_URL=${RABBITMQ_URL}
      - SEARCH_SERVICE_PORT=${SEARCH_SERVICE_PORT}
      - NODE_ENV=${NODE_ENV}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - MONGO_URI=${MONGO_URI}
      - CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
      - CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
      - CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
    networks:
      - microservices-net

  redis:
    image: redis:alpine
    restart: always # Добавь эту строку
    ports:
      - "6379:6379"
    networks:
      - microservices-net

  rabbitmq:
    image: rabbitmq:3-management
    restart: always # Добавь эту строку
    ports:
      - "5672:5672"
      - "15672:15672"
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s # Чаще проверяем при старте
      timeout: 5s
      retries: 5
    networks:
      - microservices-net

networks:
  microservices-net:
    driver: bridge

## .github/workflows/deploy.yml
name: Deploy to AWS EC2

on:
  push:
    branches:
      - main

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push
        run: |
          docker compose build
          docker compose push

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.HOST }}
          username: ubuntu
          key: ${{ secrets.VPS_SSH_PRIVATE_KEY }}
          script: |
            # 1. Подготовка папки
            mkdir -p ~/projects/node-micro-practice
            cd ~/projects/node-micro-practice

            # 2. Логика получения кода (Исправлено!)
            if [ ! -d ".git" ]; then
              echo "Папка пуста, клонирую репозиторий..."
              # Клонируем в текущую папку
              git clone https://github.com/timaZhuk/NodeJS-microservises-deploy-Test-CICD.git .
            else
              echo "Репозиторий уже есть, обновляю..."
              git fetch --all
              git reset --hard origin/main
            fi

            # 3. Теперь, когда файлы скачаны, создаем .env
            cat <<EOF > .env
            MONGO_URI=${{ secrets.MONGO_URI }}
            JWT_SECRET_KEY=${{ secrets.JWT_SECRET_KEY }}
            RABBITMQ_URL=${{ secrets.RABBITMQ_URL }}
            REDIS_URL=${{ secrets.REDIS_URL }}
            NODE_ENV=${{ secrets.NODE_ENV }}
            API_GATEWAY_PORT=${{ secrets.API_GATEWAY_PORT }}
            IDENTITY_SERVICE_URL=${{ secrets.IDENTITY_SERVICE_URL }}
            IDENTITY_SERVICE_PORT=${{ secrets.IDENTITY_SERVICE_PORT }}
            POST_SERVICE_URL=${{ secrets.POST_SERVICE_URL }}
            POST_SERVICE_PORT=${{ secrets.POST_SERVICE_PORT }}
            MEDIA_SERVICE_URL=${{ secrets.MEDIA_SERVICE_URL }}
            MEDIA_SERVICE_PORT=${{ secrets.MEDIA_SERVICE_PORT }}
            SEARCH_SERVICE_URL=${{ secrets.SEARCH_SERVICE_URL }}
            SEARCH_SERVICE_PORT=${{ secrets.SEARCH_SERVICE_PORT }}
            CLOUDINARY_API_KEY=${{ secrets.CLOUDINARY_API_KEY }}
            CLOUDINARY_API_SECRET=${{ secrets.CLOUDINARY_API_SECRET }}
            CLOUDINARY_CLOUD_NAME=${{ secrets.CLOUDINARY_CLOUD_NAME }}
            EOF

            # 4. Копируем конфиги в сервисы (теперь папки точно есть)
            cp .env ./api-gateway/.env
            cp .env ./identity-service/.env
            cp .env ./post-service/.env
            cp .env ./media-service/.env
            cp .env ./search-service/.env

            # 5. Запуск Docker
            echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin

            # Принудительно указываем файл, если он не подхватился
            docker compose -f docker-compose.yml down
            docker compose -f docker-compose.yml up -d

            docker image prune -f

## Ошибка ECONNREFUSED на t3.micro часто случается, когда RabbitMQ начинает запускаться, потребляет всю память, и ядро Linux (OOM Killer) принудительно "придушивает" его сетевой стек или сам процесс.

## Выполни эти команды на сервере (один раз):

Bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
