#!/usr/bin/env node

/**
 * API一致性测试脚本
 * 测试前端与后端API接口的一致性
 */

const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:6006';

// 测试结果统计
const testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

// 测试用例配置
const testCases = [
    {
        name: '认证API - 登录',
        method: 'POST',
        endpoint: '/api/auth/login',
        body: {
            username: 'admin',
            password: 'admin123',
            role: 'kefu'
        },
        expectedStatus: 200,
        description: '测试登录API路径修复'
    },
    {
        name: '认证API - 登出',
        method: 'POST',
        endpoint: '/api/auth/logout',
        expectedStatus: 200,
        description: '测试登出API路径修复'
    },
    {
        name: '认证API - 会话验证',
        method: 'GET',
        endpoint: '/api/auth/validate',
        expectedStatus: 200,
        description: '测试会话验证API路径修复'
    },
    {
        name: '用户API - 用户信息',
        method: 'GET',
        endpoint: '/api/user/info',
        expectedStatus: 200,
        description: '测试用户信息API'
    },
    {
        name: '用户API - 状态更新',
        method: 'POST',
        endpoint: '/api/user/status',
        body: {
            status: 'online'
        },
        expectedStatus: 200,
        description: '测试用户状态更新API'
    },
    {
        name: '用户API - 在线用户列表',
        method: 'GET',
        endpoint: '/api/users/online',
        expectedStatus: 200,
        description: '测试在线用户列表API'
    },
    {
        name: '消息API - 消息历史',
        method: 'GET',
        endpoint: '/api/messages/user_001',
        expectedStatus: 200,
        description: '测试消息历史API'
    },
    {
        name: '消息API - 消息列表',
        method: 'GET',
        endpoint: '/api/messages',
        expectedStatus: 200,
        description: '测试消息列表API'
    },
    {
        name: '文件API - 文件上传（标准路径）',
        method: 'POST',
        endpoint: '/api/file/upload',
        expectedStatus: 200,
        description: '测试标准文件上传路径'
    },
    {
        name: '文件API - 文件上传（兼容路径）',
        method: 'POST',
        endpoint: '/api/upload',
        expectedStatus: 200,
        description: '测试兼容文件上传路径'
    },
    {
        name: '文件API - 文件列表',
        method: 'GET',
        endpoint: '/api/file/list',
        expectedStatus: 200,
        description: '测试文件列表API'
    },
    {
        name: '系统API - 配置信息',
        method: 'GET',
        endpoint: '/api/config',
        expectedStatus: 200,
        description: '测试系统配置API'
    },
    {
        name: 'WebSocket API - 统计信息',
        method: 'GET',
        endpoint: '/api/websocket/stats',
        expectedStatus: 200,
        description: '测试WebSocket统计API'
    }
];

// 执行单个测试用例
async function runTest(testCase) {
    const { name, method, endpoint, body, expectedStatus, description } = testCase;
    
    console.log(`\n🧪 测试: ${name}`);
    console.log(`   描述: ${description}`);
    console.log(`   端点: ${method} ${endpoint}`);
    
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const responseText = await response.text();
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            responseData = { raw: responseText };
        }
        
        const success = response.status === expectedStatus;
        
        if (success) {
            console.log(`   ✅ 通过 - 状态码: ${response.status}`);
            testResults.passed++;
        } else {
            console.log(`   ❌ 失败 - 期望状态码: ${expectedStatus}, 实际状态码: ${response.status}`);
            console.log(`   📄 响应内容: ${JSON.stringify(responseData, null, 2)}`);
            testResults.failed++;
        }
        
        testResults.total++;
        testResults.details.push({
            name,
            success,
            expectedStatus,
            actualStatus: response.status,
            response: responseData
        });
        
    } catch (error) {
        console.log(`   ❌ 错误: ${error.message}`);
        testResults.failed++;
        testResults.total++;
        testResults.details.push({
            name,
            success: false,
            error: error.message
        });
    }
}

// 执行所有测试
async function runAllTests() {
    console.log('🚀 开始API一致性测试');
    console.log('=' * 50);
    
    for (const testCase of testCases) {
        await runTest(testCase);
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 输出测试结果
    console.log('\n' + '=' * 50);
    console.log('📊 测试结果汇总');
    console.log('=' * 50);
    console.log(`总测试数: ${testResults.total}`);
    console.log(`通过: ${testResults.passed} ✅`);
    console.log(`失败: ${testResults.failed} ❌`);
    console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    // 输出失败的测试详情
    if (testResults.failed > 0) {
        console.log('\n❌ 失败的测试:');
        testResults.details
            .filter(detail => !detail.success)
            .forEach(detail => {
                console.log(`   - ${detail.name}`);
                if (detail.error) {
                    console.log(`     错误: ${detail.error}`);
                } else {
                    console.log(`     期望状态码: ${detail.expectedStatus}, 实际状态码: ${detail.actualStatus}`);
                }
            });
    }
    
    // 输出成功的测试详情
    if (testResults.passed > 0) {
        console.log('\n✅ 成功的测试:');
        testResults.details
            .filter(detail => detail.success)
            .forEach(detail => {
                console.log(`   - ${detail.name}`);
            });
    }
    
    // 生成一致性报告
    console.log('\n📋 API一致性分析');
    console.log('=' * 50);
    
    const consistencyIssues = [];
    
    // 检查认证API路径
    const authTests = testResults.details.filter(d => d.name.includes('认证API'));
    const authSuccess = authTests.filter(d => d.success).length;
    if (authSuccess < authTests.length) {
        consistencyIssues.push('认证API路径不匹配问题未完全修复');
    }
    
    // 检查用户API
    const userTests = testResults.details.filter(d => d.name.includes('用户API'));
    const userSuccess = userTests.filter(d => d.success).length;
    if (userSuccess < userTests.length) {
        consistencyIssues.push('用户API实现不完整');
    }
    
    // 检查消息API
    const messageTests = testResults.details.filter(d => d.name.includes('消息API'));
    const messageSuccess = messageTests.filter(d => d.success).length;
    if (messageSuccess < messageTests.length) {
        consistencyIssues.push('消息API实现不完整');
    }
    
    // 检查文件API
    const fileTests = testResults.details.filter(d => d.name.includes('文件API'));
    const fileSuccess = fileTests.filter(d => d.success).length;
    if (fileSuccess < fileTests.length) {
        consistencyIssues.push('文件API路径不匹配问题未完全修复');
    }
    
    if (consistencyIssues.length === 0) {
        console.log('🎉 所有API接口一致性检查通过！');
        console.log('✅ 前端与后端API接口完全匹配');
    } else {
        console.log('⚠️  发现一致性问题:');
        consistencyIssues.forEach(issue => {
            console.log(`   - ${issue}`);
        });
    }
    
    // 返回测试结果
    return {
        success: testResults.failed === 0,
        summary: {
            total: testResults.total,
            passed: testResults.passed,
            failed: testResults.failed,
            successRate: (testResults.passed / testResults.total) * 100
        },
        details: testResults.details,
        consistencyIssues
    };
}

// 主函数
async function main() {
    try {
        const result = await runAllTests();
        
        if (result.success) {
            console.log('\n🎉 所有测试通过！API一致性修复成功！');
            process.exit(0);
        } else {
            console.log('\n❌ 部分测试失败，需要进一步修复');
            process.exit(1);
        }
    } catch (error) {
        console.error('测试执行失败:', error);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = { runAllTests, testCases };