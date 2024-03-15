# Use the nginx base image
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY release/build /usr/share/nginx/html
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
