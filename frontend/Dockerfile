FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173
# Chạy với Vite (mặc định của React mới)
CMD ["npm", "run", "dev", "--", "--host"]