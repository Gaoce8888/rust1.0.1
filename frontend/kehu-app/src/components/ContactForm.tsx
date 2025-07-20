import React from 'react';
import { Card, CardBody, CardHeader, Input, Textarea, Select, SelectItem, Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { ContactForm as ContactFormType } from '@/types';
import { submitContactForm } from '@/services/api';
import { toast } from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import { useChat } from '@/hooks/useChat';

interface ContactFormProps {
  onSuccess?: (sessionId: string) => void;
  onCancel?: () => void;
  className?: string;
}

const departments = [
  { key: 'general', label: '一般咨询' },
  { key: 'technical', label: '技术支持' },
  { key: 'billing', label: '账单问题' },
  { key: 'sales', label: '销售咨询' },
  { key: 'feedback', label: '意见反馈' },
];

const priorities = [
  { key: 'low', label: '低优先级' },
  { key: 'normal', label: '普通' },
  { key: 'high', label: '高优先级' },
];

export function ContactForm({ onSuccess, onCancel, className }: ContactFormProps) {
  const { startNewSession } = useChat();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<ContactFormType>({
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
      department: 'general',
      priority: 'normal',
    },
    mode: 'onChange',
  });

  const submitMutation = useMutation({
    mutationFn: submitContactForm,
    onSuccess: (data) => {
      toast.success('表单提交成功，正在为您创建客服会话...');
      reset();
      onSuccess?.(data.sessionId);
    },
    onError: (error) => {
      toast.error('提交失败: ' + error.message);
    },
  });

  const onSubmit = (data: ContactFormType) => {
    submitMutation.mutate(data);
  };

  const handleQuickStart = () => {
    startNewSession({
      subject: '快速咨询',
      department: 'general',
      priority: 'normal',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center pb-2">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Icon icon="mdi:message-text" className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              联系客服
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              请填写以下信息，我们会尽快为您安排专业的客服人员
            </p>
          </div>
        </CardHeader>

        <CardBody>
          <div className="space-y-6">
            {/* Quick start option */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100">
                    快速开始咨询
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    无需填写表单，直接开始聊天
                  </p>
                </div>
                <Button
                  color="primary"
                  variant="flat"
                  onPress={handleQuickStart}
                  startContent={<Icon icon="mdi:chat" />}
                >
                  开始聊天
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                  或填写详细信息
                </span>
              </div>
            </div>

            {/* Contact form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: '请输入您的姓名' }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="姓名"
                      placeholder="请输入您的姓名"
                      isRequired
                      isInvalid={!!errors.name}
                      errorMessage={errors.name?.message}
                      startContent={<Icon icon="mdi:account" className="text-gray-400" />}
                    />
                  )}
                />

                <Controller
                  name="email"
                  control={control}
                  rules={{ 
                    required: '请输入邮箱地址',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: '请输入有效的邮箱地址'
                    }
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="email"
                      label="邮箱"
                      placeholder="请输入邮箱地址"
                      isRequired
                      isInvalid={!!errors.email}
                      errorMessage={errors.email?.message}
                      startContent={<Icon icon="mdi:email" className="text-gray-400" />}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="department"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="咨询类型"
                      placeholder="请选择咨询类型"
                      selectedKeys={field.value ? [field.value] : []}
                      onSelectionChange={(keys) => {
                        const key = Array.from(keys)[0] as string;
                        field.onChange(key);
                      }}
                    >
                      {departments.map((dept) => (
                        <SelectItem key={dept.key} value={dept.key}>
                          {dept.label}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                />

                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="优先级"
                      placeholder="请选择优先级"
                      selectedKeys={field.value ? [field.value] : []}
                      onSelectionChange={(keys) => {
                        const key = Array.from(keys)[0] as string;
                        field.onChange(key);
                      }}
                    >
                      {priorities.map((priority) => (
                        <SelectItem key={priority.key} value={priority.key}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </Select>
                  )}
                />
              </div>

              <Controller
                name="subject"
                control={control}
                rules={{ required: '请输入问题主题' }}
                render={({ field }) => (
                  <Input
                    {...field}
                    label="问题主题"
                    placeholder="请简要描述您的问题"
                    isRequired
                    isInvalid={!!errors.subject}
                    errorMessage={errors.subject?.message}
                  />
                )}
              />

              <Controller
                name="message"
                control={control}
                rules={{ required: '请详细描述您的问题' }}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    label="问题描述"
                    placeholder="请详细描述您遇到的问题，以便我们更好地为您服务"
                    minRows={4}
                    maxRows={8}
                    isRequired
                    isInvalid={!!errors.message}
                    errorMessage={errors.message?.message}
                  />
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  color="primary"
                  className="flex-1"
                  isLoading={submitMutation.isPending}
                  isDisabled={!isValid}
                  startContent={<Icon icon="mdi:send" />}
                >
                  提交并开始咨询
                </Button>
                
                {onCancel && (
                  <Button
                    variant="light"
                    onPress={onCancel}
                    isDisabled={submitMutation.isPending}
                  >
                    取消
                  </Button>
                )}
              </div>
            </form>

            {/* Help text */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p>
                提交表单后，系统会自动为您分配客服人员。
                <br />
                通常响应时间为 1-3 分钟。
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}