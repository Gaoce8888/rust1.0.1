#!/bin/bash

# JWT认证测试脚本
BASE_URL="http://localhost:6006"

echo "🔐 JWT认证系统测试"
echo "=================="

# 测试1: 客服登录
echo ""
echo "1. 测试客服登录..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "user_type": "kefu"
  }')

echo "登录响应: $LOGIN_RESPONSE"

# 提取token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo "✅ 登录成功，获取到token"
    
    # 测试2: 验证token
    echo ""
    echo "2. 测试token验证..."
    VALIDATE_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/validate" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "验证响应: $VALIDATE_RESPONSE"
    
    # 测试3: 获取在线用户列表
    echo ""
    echo "3. 测试获取在线用户列表..."
    ONLINE_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/online?user_type=kefu" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "在线用户响应: $ONLINE_RESPONSE"
    
    # 测试4: 心跳检测
    echo ""
    echo "4. 测试心跳检测..."
    HEARTBEAT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/heartbeat" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "心跳响应: $HEARTBEAT_RESPONSE"
    
    # 测试5: 登出
    echo ""
    echo "5. 测试登出..."
    LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/logout" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "登出响应: $LOGOUT_RESPONSE"
    
else
    echo "❌ 登录失败，无法获取token"
fi

echo ""
echo "测试完成！"