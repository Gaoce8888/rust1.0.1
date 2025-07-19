import React from "react";
import {
  Button,
  Input,
  Checkbox,
  Link,
  Form,
  Divider,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Chip,
  Avatar
} from "@heroui/react";
import { Icon } from "@iconify/react";

export default function LoginPage({ onLoginSuccess }) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const toggleVisibility = () => setIsVisible(!isVisible);

  // 处理表单提交
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:6006';
      
      const response = await fetch(`${baseUrl}/api/kefu/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 保存用户信息
        const userInfo = {
          id: data.kefu_id,
          name: data.real_name,
          username: username,
          type: 'kefu',
          sessionToken: data.session_token,
          maxCustomers: data.max_customers,
        };

        // 如果选择记住我，保存到localStorage
        if (remember) {
          localStorage.setItem('kefu_user', JSON.stringify(userInfo));
          localStorage.setItem('kefu_session_token', data.session_token);
          localStorage.setItem('kefu_remember', 'true');
        } else {
          sessionStorage.setItem('kefu_user', JSON.stringify(userInfo));
          sessionStorage.setItem('kefu_session_token', data.session_token);
        }

        // 调用成功回调
        if (onLoginSuccess) {
          onLoginSuccess(userInfo);
        }
      } else {
        setError(data.message || '登录失败');
      }
    } catch (err) {
      console.error('登录错误:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 快速登录账号
  const quickAccounts = [
    { username: 'kefu001', password: '123456', name: '客服小王' },
    { username: 'kefu002', password: '123456', name: '客服小李' },
  ];

  // 快速填充账号
  const handleQuickFill = (account) => {
    setUsername(account.username);
    setPassword(account.password);
    setError("");
  };

  // 检查是否记住了账号
  React.useEffect(() => {
    const remembered = localStorage.getItem('kefu_remember');
    if (remembered === 'true') {
      const savedUser = localStorage.getItem('kefu_user');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          setUsername(user.username || '');
          setRemember(true);
        } catch (e) {
          console.error('解析保存的用户信息失败');
        }
      }
    }
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-default-100 via-primary-100 to-secondary-100">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="flex flex-col gap-1 px-8 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Icon icon="solar:chat-round-line-duotone" className="text-white" width={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">客服系统登录</h1>
              <p className="text-small text-default-500">企业级客服管理平台</p>
            </div>
          </div>
        </CardHeader>
        
        <CardBody className="px-8 py-6">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              isRequired
              label="账号"
              name="username"
              placeholder="请输入客服账号"
              type="text"
              variant="bordered"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              startContent={
                <Icon icon="solar:user-linear" className="text-default-400" width={20} />
              }
              isInvalid={!!error && !username}
              errorMessage={!username && error ? "请输入账号" : ""}
            />
            
            <Input
              isRequired
              label="密码"
              name="password"
              placeholder="请输入密码"
              type={isVisible ? "text" : "password"}
              variant="bordered"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              startContent={
                <Icon icon="solar:lock-password-linear" className="text-default-400" width={20} />
              }
              endContent={
                <button
                  className="focus:outline-none"
                  type="button"
                  onClick={toggleVisibility}
                  aria-label="toggle password visibility"
                >
                  {isVisible ? (
                    <Icon
                      className="pointer-events-none text-2xl text-default-400"
                      icon="solar:eye-closed-linear"
                    />
                  ) : (
                    <Icon
                      className="pointer-events-none text-2xl text-default-400"
                      icon="solar:eye-bold"
                    />
                  )}
                </button>
              }
              isInvalid={!!error && !password}
              errorMessage={!password && error ? "请输入密码" : ""}
            />
            
            <div className="flex w-full items-center justify-between px-1">
              <Checkbox
                name="remember"
                size="sm"
                isSelected={remember}
                onValueChange={setRemember}
              >
                记住我
              </Checkbox>
              <Link className="text-default-500" href="#" size="sm">
                忘记密码？
              </Link>
            </div>

            {error && (
              <Chip color="danger" variant="flat" className="w-full">
                <span className="text-small">{error}</span>
              </Chip>
            )}
            
            <Button
              className="w-full"
              color="primary"
              type="submit"
              isLoading={isLoading}
              startContent={!isLoading && <Icon icon="solar:login-3-linear" width={20} />}
            >
              {isLoading ? "登录中..." : "登录"}
            </Button>
          </form>

          <div className="flex items-center gap-4 py-4">
            <Divider className="flex-1" />
            <p className="shrink-0 text-tiny text-default-500">快速登录</p>
            <Divider className="flex-1" />
          </div>

          <div className="flex flex-col gap-2">
            {quickAccounts.map((account, index) => (
              <Button
                key={index}
                variant="flat"
                size="sm"
                startContent={
                  <Avatar
                    size="sm"
                    name={account.name}
                    className="w-5 h-5"
                  />
                }
                onClick={() => handleQuickFill(account)}
                className="justify-start"
              >
                <div className="flex flex-col items-start">
                  <span className="text-small">{account.name}</span>
                  <span className="text-tiny text-default-400">{account.username}</span>
                </div>
              </Button>
            ))}
          </div>
        </CardBody>

        <CardFooter className="px-8 pb-6">
          <div className="flex flex-col w-full gap-2">
            <p className="text-center text-tiny text-default-400">
              版本 v1.0.0 | © 2025 企业级客服系统
            </p>
            <div className="flex justify-center gap-2">
              <Link href="#" size="sm" className="text-default-400">
                使用帮助
              </Link>
              <span className="text-default-300">|</span>
              <Link href="#" size="sm" className="text-default-400">
                联系管理员
              </Link>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}