FROM node:20-slim
RUN apt-get update && apt-get install -y chromium xvfb fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnss3 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 xdg-utils libxshmfence1 --no-install-recommends && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV DISPLAY=:99
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
RUN mkdir -p public/screenshots data
EXPOSE 3000
CMD ["sh","-c","Xvfb :99 -screen 0 1280x800x24 & npm start"]
