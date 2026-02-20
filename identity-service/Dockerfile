# use the official node.js 18 image with linux as the base image
FROM node:18-alpine

# working directory inside container
WORKDIR /use/src/app 

#copy package*.json file to WORKDIR
COPY package*.json ./

#install only production dependencies
RUN npm ci --only=production

#copy rest the application code api-gateway --> /use/src/app
COPY . .

EXPOSE 4001

CMD ["node", "src/server.js"]