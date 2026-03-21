# ===== 1. 前端构建 =====
FROM node:24-alpine AS frontend-build

WORKDIR /app

# 安装依赖（CI 更快、锁版本）
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# ===== 2. Python 构建 =====
FROM python:3.12-alpine AS backend-build

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 安装 pip build 依赖
RUN apk add --no-cache build-base libffi-dev

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# ===== 3. 最终运行镜像 =====
FROM nginx:alpine

WORKDIR /app

EXPOSE 80

VOLUME /app/data

# 安装 Python + Pandoc
RUN apk add --no-cache python3 py3-pip pandoc

# 拷贝 Python 环境
COPY --from=backend-build /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY --from=backend-build /usr/local/bin /usr/local/bin

# 拷贝前端构建产物
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 拷贝应用代码
COPY main.py start.py .
COPY api ./api

# 启动：Python + Nginx
ENTRYPOINT ["tini", "--"]
CMD ["sh", "-c", "nginx -g 'daemon off;' & exec uvicorn main:app --host 0.0.0.0 --port 38888"]