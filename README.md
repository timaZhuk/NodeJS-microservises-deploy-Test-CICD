## Без подгрузки с DockerHub но рабочие
## docker-compose.txt file

## deploy.txt

## Ошибка ECONNREFUSED на t3.micro часто случается, когда RabbitMQ начинает запускаться, потребляет всю память, и ядро Linux (OOM Killer) принудительно "придушивает" его сетевой стек или сам процесс.

## Выполни эти команды на сервере (один раз):

Bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
