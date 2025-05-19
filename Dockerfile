# 基于官方 Deno 镜像
FROM denoland/deno:alpine-1.43.6

# 创建必要的目录并设置权限
RUN mkdir -p /app/data /app/logs && \
    chmod -R 755 /app

# 创建工作目录
WORKDIR /app

# 拷贝项目文件到容器的工作目录
COPY . /app/


# 暴露端口（与 deno_index.ts 保持一致）
EXPOSE 9080

# 确保启动脚本有执行权限
RUN chmod +x /app/deno_start.sh

# 启动命令
CMD ["/bin/sh", "-c", "rm -f deno.lock && /app/deno_start.sh && tail -f /app/deno_app.log"]
