"use client";

import React from "react";
import {Button, Tooltip} from "@heroui/react";
import {Icon} from "@iconify/react";
import {cn} from "@heroui/react";

import PromptInput from "./prompt-input";

// 带操作按钮的输入框组件
// 包含文件上传、语音输入和发送消息等功能按钮
export default function Component(props) {
  // 输入内容状态管理
  const [prompt, setPrompt] = React.useState("");

  return (
    <form className="flex w-full items-start gap-2">
      <PromptInput
        {...props}
        classNames={{
          innerWrapper: cn("items-center", props.classNames?.innerWrapper),
          input: cn(
            "text-medium data-[has-start-content=true]:ps-0 data-[has-start-content=true]:pe-0",
            props.classNames?.input,
          ),
        }}
        endContent={
          <div className="flex gap-2">
            {/* 语音输入按钮 - 仅在输入框为空时显示 */}
            {!prompt && (
              <Tooltip showArrow content="Speak">
                <Button isIconOnly radius="full" variant="light">
                  <Icon className="text-default-500" icon="solar:microphone-3-linear" width={20} />
                </Button>
              </Tooltip>
            )}

            {/* 发送消息按钮 - 根据是否有内容改变样式 */}
            <Tooltip showArrow content="Send message">
              <Button
                isIconOnly
                className={props?.classNames?.button || ""}
                color={!prompt ? "default" : "primary"}
                isDisabled={!prompt}
                radius="full"
                variant={!prompt ? "flat" : "solid"}
              >
                <Icon
                  className={cn(
                    "[&>path]:stroke-[2px]",
                    !prompt ? "text-default-500" : "text-primary-foreground",
                    props?.classNames?.buttonIcon || "",
                  )}
                  icon="solar:arrow-up-linear"
                  width={20}
                />
              </Button>
            </Tooltip>
          </div>
        }
        startContent={
          /* 文件上传按钮 - 位于输入框左侧 */
          <Tooltip showArrow content="Add file">
            <Button isIconOnly className="p-[10px]" radius="full" variant="light">
              <Icon className="text-default-500" icon="solar:paperclip-linear" width={20} />
            </Button>
          </Tooltip>
        }
        value={prompt}
        onValueChange={setPrompt}
      />
    </form>
  );
}
