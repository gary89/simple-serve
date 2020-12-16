FROM node:alpine
COPY ./simple-serve.js .
CMD ["node", "simple-serve.js", "/", "dockerized"]
