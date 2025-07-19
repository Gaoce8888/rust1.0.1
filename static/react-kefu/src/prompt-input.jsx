"use client";

import React from "react";
import {Textarea} from "@heroui/react";
import {cn} from "@heroui/react";

// 提示词输入框组件
// 一个自动调整高度的多行文本输入框，用于输入AI提示词
const PromptInput = React.forwardRef(({classNames = {}, ...props}, ref) => {
  return (
    <Textarea
      ref={ref}
      aria-label="Prompt"
      className="min-h-[40px]"  // 最小高度40px
      classNames={{
        ...classNames,
        label: cn("hidden", classNames?.label),  // 隐藏标签
        input: cn("py-0", classNames?.input),    // 移除垂直内边距
      }}
      minRows={1}  // 最少显示1行
      placeholder="Enter a prompt here"
      radius="lg"   // 大圆角
      variant="bordered"  // 带边框样式
      {...props}
    />
  );
});

export default PromptInput;

PromptInput.displayName = "PromptInput";
