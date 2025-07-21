#!/bin/bash

# 双REST后端API互通方案部署脚本

set -e

echo "🚀 开始部署双REST后端API互通方案..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 创建必要的目录
echo "📁 创建必要的目录..."
mkdir -p logs
mkdir -p enhanced-backend/ai-service/src
mkdir -p enhanced-backend/react-card-service/src
mkdir -p enhanced-backend/analytics-service/src
mkdir -p enhanced-backend/enterprise-service/src

# 设置环境变量
echo "🔧 设置环境变量..."
export OPENAI_API_KEY=${OPENAI_API_KEY:-""}
export ANALYTICS_DATABASE_URL=${ANALYTICS_DATABASE_URL:-"postgresql://analytics_user:analytics_password@analytics-db:5432/kefu_analytics"}
export ANALYTICS_REDIS_URL=${ANALYTICS_REDIS_URL:-"redis://analytics-redis:6379"}

# 构建并启动服务
echo "🔨 构建并启动服务..."
docker-compose build

echo "🚀 启动所有服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 检查服务健康状态
echo "🏥 检查服务健康状态..."
services=("core-backend" "ai-service" "react-card-service" "analytics-service" "enterprise-service")

for service in "${services[@]}"; do
    echo "检查 $service 服务..."
    if curl -f http://localhost:$(docker-compose port $service 8080 | cut -d: -f2)/health > /dev/null 2>&1; then
        echo "✅ $service 服务健康"
    else
        echo "❌ $service 服务不健康"
    fi
done

# 显示服务状态
echo "📊 显示服务状态..."
docker-compose ps

# 显示访问地址
echo "🌐 服务访问地址:"
echo "  主后端服务: http://localhost:8080"
echo "  AI服务: http://localhost:8081"
echo "  React卡片服务: http://localhost:8082"
echo "  数据分析服务: http://localhost:8083"
echo "  企业级服务: http://localhost:8084"
echo "  前端应用: http://localhost:3000"
echo "  Prometheus监控: http://localhost:9090"
echo "  Grafana仪表板: http://localhost:3001 (admin/admin)"

echo "✅ 部署完成！"
echo ""
echo "📝 使用说明:"
echo "  1. 停止服务: docker-compose down"
echo "  2. 查看日志: docker-compose logs -f [服务名]"
echo "  3. 重启服务: docker-compose restart [服务名]"
echo "  4. 更新服务: docker-compose pull && docker-compose up -d"
echo ""
echo "🔍 故障排除:"
echo "  1. 检查服务状态: docker-compose ps"
echo "  2. 查看详细日志: docker-compose logs [服务名]"
echo "  3. 进入容器: docker-compose exec [服务名] bash"
echo "  4. 重启所有服务: docker-compose restart"