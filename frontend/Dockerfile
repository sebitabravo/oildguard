# S0 stub — see App.tsx header comment for Sim A/B future.
FROM node:20.18.0-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . ./
EXPOSE 5173
CMD ["npm", "run", "dev"]
