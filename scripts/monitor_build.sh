#!/bin/bash

# 编译进度监控脚本
# 显示编译进度和统计信息

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 清屏
clear

echo -e "${BLUE}=== 生产编译监控 ===${NC}\n"

# 监控编译日志
while true; do
    # 获取编译统计
    if [ -f build.log ]; then
        TOTAL_CRATES=$(grep -c "Compiling" build.log 2>/dev/null || echo 0)
        COMPLETED=$(grep -E "Compiling|Finished" build.log | wc -l 2>/dev/null || echo 0)
        ERRORS=$(grep -c "error:" build.log 2>/dev/null || echo 0)
        WARNINGS=$(grep -c "warning:" build.log 2>/dev/null || echo 0)
        
        # 计算进度
        if [ $TOTAL_CRATES -gt 0 ]; then
            PROGRESS=$((COMPLETED * 100 / TOTAL_CRATES))
        else
            PROGRESS=0
        fi
        
        # 显示状态
        echo -ne "\r${GREEN}进度:${NC} ["
        
        # 进度条
        BAR_LENGTH=50
        FILLED=$((PROGRESS * BAR_LENGTH / 100))
        for i in $(seq 1 $BAR_LENGTH); do
            if [ $i -le $FILLED ]; then
                echo -ne "█"
            else
                echo -ne "░"
            fi
        done
        
        echo -ne "] ${PROGRESS}% "
        echo -ne "(${COMPLETED}/${TOTAL_CRATES} crates) "
        
        if [ $ERRORS -gt 0 ]; then
            echo -ne "${RED}错误: $ERRORS${NC} "
        fi
        
        if [ $WARNINGS -gt 0 ]; then
            echo -ne "${YELLOW}警告: $WARNINGS${NC} "
        fi
        
        # 检查是否完成
        if grep -q "Finished release" build.log 2>/dev/null; then
            echo -e "\n\n${GREEN}✅ 编译成功完成!${NC}"
            
            # 显示二进制文件信息
            if [ -f target/release/kefu-system ]; then
                SIZE=$(du -h target/release/kefu-system | cut -f1)
                echo -e "\n二进制文件: target/release/kefu-system"
                echo -e "文件大小: $SIZE"
                
                # 显示编译时间
                BUILD_TIME=$(grep "Finished release" build.log | tail -1 | sed -E 's/.*in ([0-9]+\.[0-9]+)s/\1s/')
                echo -e "编译时间: $BUILD_TIME"
            fi
            break
        fi
        
        # 检查是否失败
        if grep -q "error: could not compile" build.log 2>/dev/null; then
            echo -e "\n\n${RED}❌ 编译失败!${NC}"
            echo -e "\n最后的错误:"
            grep -A5 "error:" build.log | tail -10
            break
        fi
    else
        echo -ne "\r等待编译开始..."
    fi
    
    sleep 1
done

echo -e "\n\n编译日志保存在: build.log"