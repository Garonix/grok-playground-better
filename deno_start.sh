# 确保日志目录存在
mkdir -p /app/logs

# 启动应用并记录日志
nohup deno run --allow-net --allow-read --allow-write src/deno_index.ts >> /app/logs/deno_app.log 2>&1 &
echo "Deno application started with PID: $!"

# 显示日志
tail -f /app/logs/deno_app.log