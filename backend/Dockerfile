FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

# Add PostgreSQL APT repository and install postgresql-client-16
RUN apt-get update && apt-get install -y lsb-release wget && \
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - && \
    echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list && \
    apt-get update && \
    apt-get install -y postgresql-client-16

COPY . .

EXPOSE 5000

CMD ["node", "index.js"]