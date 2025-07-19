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
  Avatar,
  Spinner
} from "@heroui/react";
import { Icon } from "@iconify/react";

export default function LoginPage({ onLoginSuccess }) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [selectedAccount, setSelectedAccount] = React.useState(null);

  const toggleVisibility = () => setIsVisible(!isVisible);

  // 处理表单提交 - 适配最新后端API
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
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
        // 保存用户信息 - 适配新的后端响应格式
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
    { username: 'kefu001', password: '123456', name: '客服小王', avatar: '👨‍💼', status: 'online' },
    { username: 'kefu002', password: '123456', name: '客服小李', avatar: '👩‍💼', status: 'offline' },
  ];

  // 快速填充账号
  const handleQuickFill = (account) => {
    setUsername(account.username);
    setPassword(account.password);
    setSelectedAccount(account.username);
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
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-purple-200 to-pink-200 opacity-30 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 rounded-full bg-gradient-to-tr from-blue-200 to-cyan-200 opacity-30 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200 opacity-20 blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md shadow-2xl backdrop-blur-sm bg-white/90 border-0">
        <CardHeader className="flex flex-col gap-1 px-8 pt-8 pb-0">
          <div className="flex flex-col items-center gap-4">
            {/* Logo动画 */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-60 animate-pulse"></div>
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                <Icon icon="solar:chat-round-line-duotone" className="text-white" width={32} />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                客服系统登录
              </h1>
              <p className="text-small text-default-500 mt-1">企业级智能客服管理平台 v2.0</p>
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
              classNames={{
                input: "text-small",
                inputWrapper: "hover:border-purple-400 focus-within:!border-purple-500"
              }}
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
              classNames={{
                input: "text-small",
                inputWrapper: "hover:border-purple-400 focus-within:!border-purple-500"
              }}
              isInvalid={!!error && !password}
              errorMessage={!password && error ? "请输入密码" : ""}
            />
            
            <div className="flex w-full items-center justify-between px-1">
              <Checkbox
                name="remember"
                size="sm"
                isSelected={remember}
                onValueChange={setRemember}
                classNames={{
                  wrapper: "before:border-purple-400"
                }}
              >
                <span className="text-small text-default-600">记住我</span>
              </Checkbox>
              <Link className="text-purple-500 hover:text-purple-600" href="#" size="sm">
                忘记密码？
              </Link>
            </div>

            {error && (
              <Chip color="danger" variant="flat" className="w-full animate-shake">
                <span className="text-small">{error}</span>
              </Chip>
            )}
            
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
              type="submit"
              isLoading={isLoading}
              spinner={<Spinner color="white" size="sm" />}
              startContent={!isLoading && <Icon icon="solar:login-3-linear" width={20} />}
            >
              {isLoading ? "登录中..." : "立即登录"}
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
                variant={selectedAccount === account.username ? "flat" : "light"}
                size="md"
                startContent={
                  <div className="relative">
                    <span className="text-2xl">{account.avatar}</span>
                    {account.status === 'online' && (
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                    )}
                  </div>
                }
                onClick={() => handleQuickFill(account)}
                className={`justify-start hover:scale-[1.02] transition-all ${
                  selectedAccount === account.username 
                    ? 'bg-purple-100 border-purple-400' 
                    : 'hover:bg-default-100'
                }`}
              >
                <div className="flex flex-col items-start ml-2">
                  <span className="text-small font-medium">{account.name}</span>
                  <span className="text-tiny text-default-400">{account.username}</span>
                </div>
              </Button>
            ))}
          </div>
        </CardBody>

        <CardFooter className="px-8 pb-6">
          <div className="flex flex-col w-full gap-3">
            <div className="flex justify-center gap-4 text-tiny text-default-400">
              <Link href="#" className="hover:text-purple-500 transition-colors">
                <Icon icon="solar:shield-check-linear" width={16} className="inline mr-1" />
                安全登录
              </Link>
              <span className="text-default-300">|</span>
              <Link href="#" className="hover:text-purple-500 transition-colors">
                <Icon icon="solar:question-circle-linear" width={16} className="inline mr-1" />
                使用帮助
              </Link>
              <span className="text-default-300">|</span>
              <Link href="#" className="hover:text-purple-500 transition-colors">
                <Icon icon="solar:phone-linear" width={16} className="inline mr-1" />
                联系管理员
              </Link>
            </div>
            <p className="text-center text-tiny text-default-400">
              © 2025 企业级客服系统 | 已适配最新后端API
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

// 添加抖动动画样式
const shakeAnimation = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
}
.animate-shake {
  animation: shake 0.5s ease-in-out;
}
`;

// 将样式注入到页面
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shakeAnimation;
  document.head.appendChild(style);
}