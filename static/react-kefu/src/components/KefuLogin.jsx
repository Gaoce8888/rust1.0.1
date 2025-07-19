import React, { useState } from 'react';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Divider,
  Link,
  Chip,
  Avatar,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { Icon } from "@iconify/react";

/**
 * 客服登录组件
 * 提供客服认证功能
 */
export default function KefuLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // 默认账号信息
  const defaultAccounts = [
    { username: 'kefu001', password: '123456', name: '客服小王', id: 'kf001' },
    { username: 'kefu002', password: '123456', name: '客服小李', id: 'kf002' },
  ];

  // 处理登录
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 获取API基础URL
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:6006';
      
      const response = await fetch(`${baseUrl}/api/kefu/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 登录成功，保存用户信息和token
        const userInfo = {
          id: data.kefu_id,
          name: data.real_name,
          username: username,
          maxCustomers: data.max_customers,
          sessionToken: data.session_token,
          type: 'kefu',
        };

        // 保存到localStorage
        localStorage.setItem('kefu_user', JSON.stringify(userInfo));
        localStorage.setItem('kefu_session_token', data.session_token);

        // 通知父组件登录成功
        onLoginSuccess(userInfo);
      } else {
        setError(data.message || '登录失败');
      }
    } catch (error) {
      console.error('登录请求失败:', error);
      setError('网络错误，请检查服务器连接');
    } finally {
      setIsLoading(false);
    }
  };

  // 快速登录
  const handleQuickLogin = async (account) => {
    setUsername(account.username);
    setPassword(account.password);
    onClose();
    
    // 自动执行登录
    setError('');
    setIsLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:6006';
      
      const response = await fetch(`${baseUrl}/api/kefu/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: account.username,
          password: account.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const userInfo = {
          id: data.kefu_id,
          name: data.real_name,
          username: account.username,
          maxCustomers: data.max_customers,
          sessionToken: data.session_token,
          type: 'kefu',
        };

        localStorage.setItem('kefu_user', JSON.stringify(userInfo));
        localStorage.setItem('kefu_session_token', data.session_token);

        onLoginSuccess(userInfo);
      } else {
        setError(data.message || '登录失败');
      }
    } catch (error) {
      console.error('登录请求失败:', error);
      setError('网络错误，请检查服务器连接');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center pb-6">
          <div className="flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <Icon icon="solar:user-check-rounded-bold" className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">客服工作台</h1>
          <p className="text-sm text-default-500 mt-2">请登录您的客服账号</p>
        </CardHeader>

        <CardBody className="px-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="用户名"
              placeholder="请输入客服账号"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              startContent={<Icon icon="solar:user-linear" className="text-default-400" />}
              isRequired
              classNames={{
                input: "text-sm",
                label: "text-sm",
              }}
            />

            <Input
              label="密码"
              placeholder="请输入密码"
              type={isPasswordVisible ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              startContent={<Icon icon="solar:lock-linear" className="text-default-400" />}
              endContent={
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  className="focus:outline-none"
                >
                  <Icon
                    icon={isPasswordVisible ? "solar:eye-closed-linear" : "solar:eye-linear"}
                    className="text-default-400"
                  />
                </button>
              }
              isRequired
              classNames={{
                input: "text-sm",
                label: "text-sm",
              }}
            />

            {error && (
              <div className="flex items-center gap-2 text-danger text-sm">
                <Icon icon="solar:danger-circle-linear" className="text-danger" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              color="primary"
              className="w-full"
              isLoading={isLoading}
              disabled={!username || !password}
            >
              {isLoading ? '登录中...' : '登录'}
            </Button>
          </form>

          <Divider className="my-4" />

          <div className="text-center">
            <Button
              variant="flat"
              size="sm"
              onClick={onOpen}
              startContent={<Icon icon="solar:question-circle-linear" />}
            >
              查看测试账号
            </Button>
          </div>
        </CardBody>

        <CardFooter className="flex flex-col items-center pt-0">
          <div className="flex items-center gap-2 text-tiny text-default-400">
            <Icon icon="solar:shield-check-linear" />
            <span>企业级客服系统 v1.0</span>
          </div>
        </CardFooter>
      </Card>

      {/* 测试账号模态框 */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Icon icon="solar:user-check-rounded-bold" className="text-primary" />
              <span>测试账号</span>
            </div>
            <p className="text-sm text-default-500 font-normal">
              您可以使用以下预设账号进行测试
            </p>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {defaultAccounts.map((account, index) => (
                <Card key={index} className="p-4" shadow="sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        size="sm"
                        name={account.name}
                        className="bg-primary-100 text-primary"
                      />
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-default-500">工号: {account.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <Chip size="sm" variant="flat" color="primary">
                          {account.username}
                        </Chip>
                      </div>
                      <div className="flex items-center gap-2">
                        <Chip size="sm" variant="flat" color="secondary">
                          {account.password}
                        </Chip>
                      </div>
                    </div>
                  </div>
                  <Divider className="my-3" />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      onClick={() => handleQuickLogin(account)}
                    >
                      使用此账号
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={onClose}>
              关闭
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}