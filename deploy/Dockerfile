FROM node:22-alpine AS student-build
WORKDIR /app
COPY student/package*.json ./
RUN npm ci
COPY student/ ./
RUN npm run build

FROM node:22-alpine AS teacher-build
WORKDIR /app
COPY teacher/package*.json ./
RUN npm ci
COPY teacher/ ./
RUN npm run build

FROM nginx:alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=student-build /app/dist /usr/share/nginx/html/student
COPY --from=teacher-build /app/dist /usr/share/nginx/html/teacher
