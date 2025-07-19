"use client";

import React from "react";
import {TRANSITION_EASINGS} from "@heroui/framer-utils";
import {cn, Drawer, DrawerBody, DrawerContent} from "@heroui/react";

// 侧边栏抽屉组件
// 可以在移动端显示为抽屉式菜单，桌面端显示为固定侧边栏
const SidebarDrawer = React.forwardRef(
  (
    {
      children,              // 子组件内容
      className,             // 自定义类名
      onOpenChange,          // 开关状态改变回调
      isOpen,                // 是否打开
      sidebarWidth = 288,    // 侧边栏宽度（默认288px）
      classNames = {},       // 各部分自定义类名
      sidebarPlacement = "left",  // 侧边栏位置（左侧或右侧）
      motionProps: drawerMotionProps,  // 动画属性
      ...props
    },
    ref,
  ) => {
    // 动画配置 - 使用 useMemo 优化性能
    const motionProps = React.useMemo(() => {
      // 如果提供了自定义动画属性，直接使用
      if (!!drawerMotionProps && typeof drawerMotionProps === "object") {
        return drawerMotionProps;
      }

      // 默认动画配置
      return {
        variants: {
          enter: {  // 进入动画
            x: 0,
            transition: {
              x: {
                duration: 0.3,
                ease: TRANSITION_EASINGS.easeOut,
              },
            },
          },
          exit: {
            x: sidebarPlacement == "left" ? -sidebarWidth : sidebarWidth,
            transition: {
              x: {
                duration: 0.2,
                ease: TRANSITION_EASINGS.easeOut,
              },
            },
          },
        },
      };
    }, [sidebarWidth, sidebarPlacement, drawerMotionProps]);

    return (
      <>
        <Drawer
          ref={ref}
          {...props}
          classNames={{
            ...classNames,
            wrapper: cn("!w-[var(--sidebar-width)]", classNames?.wrapper, {
              "!items-start !justify-start ": sidebarPlacement === "left",
              "!items-end !justify-end": sidebarPlacement === "right",
            }),
            base: cn(
              "w-[var(--sidebar-width)] !m-0 p-0 h-full max-h-full",
              classNames?.base,
              className,
              {
                "inset-y-0 left-0 max-h-[none] rounded-l-none !justify-start":
                  sidebarPlacement === "left",
                "inset-y-0 right-0 max-h-[none] rounded-r-none !justify-end":
                  sidebarPlacement === "right",
              },
            ),
            body: cn("p-0", classNames?.body),
            closeButton: cn("z-50", classNames?.closeButton),
          }}
          isOpen={isOpen}
          motionProps={motionProps}
          radius="none"
          scrollBehavior="inside"
          style={{
            // @ts-ignore
            "--sidebar-width": `${sidebarWidth}px`,
          }}
          onOpenChange={onOpenChange}
        >
          <DrawerContent>
            <DrawerBody>{children}</DrawerBody>
          </DrawerContent>
        </Drawer>
        <div
          className={cn(
            "hidden h-full max-w-[var(--sidebar-width)] overflow-x-hidden overflow-y-scroll sm:flex",
            className,
          )}
        >
          {children}
        </div>
      </>
    );
  },
);

SidebarDrawer.displayName = "SidebarDrawer";

export default SidebarDrawer;
