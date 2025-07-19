"use client";

import React from "react";
import {
  Avatar,
  Button,
  ScrollShadow,
  Listbox,
  ListboxItem,
  ListboxSection,
  Spacer,
  useDisclosure,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  cn,
  Badge,
  Chip,
} from "@heroui/react";
import {Icon} from "@iconify/react";

import {AcmeIcon} from "./acme";
import SidebarDrawer from "./sidebar-drawer";

// 在线客户示例数据
const onlineCustomers = [
  {
    id: "customer-1",
    name: "张三",
    avatar: "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/3a906b3de8eaa53e14582edf5c918b5d.jpg",
    status: "online",
    statusText: "在线",
    lastMessage: "请问这个产品有优惠吗？",
    lastMessageTime: "2分钟前",
    unreadCount: 2,
    waitingTime: "00:45",
    location: "北京",
    deviceType: "mobile"
  },
  {
    id: "customer-2", 
    name: "李四",
    avatar: "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/e1b8ec120710c09589a12c0004f85421.jpg",
    status: "online",
    statusText: "在线",
    lastMessage: "订单什么时候能发货？",
    lastMessageTime: "5分钟前",
    unreadCount: 1,
    waitingTime: "02:30",
    location: "上海",
    deviceType: "desktop"
  },
  {
    id: "customer-3",
    name: "王五",
    avatar: "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/3940f3b3e3cd0d58c3f33f9f3b3f3f3f.jpg",
    status: "busy",
    statusText: "正在输入...",
    lastMessage: "我想退换货",
    lastMessageTime: "10分钟前",
    unreadCount: 0,
    waitingTime: "05:15",
    location: "广州",
    deviceType: "mobile"
  },
  {
    id: "customer-4",
    name: "赵六",
    avatar: "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/b4d1b9bc5f7c6f4e8e9f7a7e9f7a7e9f.jpg",
    status: "away",
    statusText: "离开",
    lastMessage: "好的，我考虑一下",
    lastMessageTime: "30分钟前",
    unreadCount: 0,
    waitingTime: "15:00",
    location: "深圳",
    deviceType: "desktop"
  },
  {
    id: "customer-5",
    name: "孙七",
    avatar: "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/a5e6c7d8e9f0a1b2c3d4e5f6a7b8c9d0.jpg",
    status: "online",
    statusText: "在线",
    lastMessage: "客服在吗？",
    lastMessageTime: "刚刚",
    unreadCount: 3,
    waitingTime: "00:05",
    location: "杭州",
    deviceType: "mobile"
  },
  {
    id: "customer-6",
    name: "周八",
    avatar: "https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6.jpg",
    status: "online",
    statusText: "在线",
    lastMessage: "发票怎么开？",
    lastMessageTime: "1分钟前",
    unreadCount: 1,
    waitingTime: "00:30",
    location: "成都",
    deviceType: "desktop"
  }
];

// 获取状态颜色
function getStatusColor(status) {
  switch (status) {
    case "online":
      return "success";
    case "busy":
      return "warning";
    case "away":
      return "default";
    default:
      return "default";
  }
}

// 头像下拉菜单图标组件
// 显示上下箭头的SVG图标
function AvatarDropdownIcon(props) {
  return (
    <svg
      {...props}
      fill="none"
      height="20"
      viewBox="0 0 20 20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_3076_10614)">
        <path
          d="M6.6665 7.50008L9.99984 4.16675L13.3332 7.50008"
          stroke="#A1A1AA"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M13.3332 12.5L9.99984 15.8333L6.6665 12.5"
          stroke="#A1A1AA"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_3076_10614">
          <rect fill="white" height="20" width="20" />
        </clipPath>
      </defs>
    </svg>
  );
}

// 客户操作下拉菜单
// 提供开始聊天、查看资料、聊天记录等功能
function CustomerActionDropdown() {
  return (
    <Dropdown>
      <DropdownTrigger>
        {/* 三点菜单图标 - 鼠标悬停时显示 */}
        <Icon
          className="text-default-500 opacity-0 group-hover:opacity-100"
          icon="solar:menu-dots-bold"
          width={24}
        />
      </DropdownTrigger>
      <DropdownMenu aria-label="Customer actions" className="py-2" variant="faded">
        <DropdownItem
          key="chat"
          className="text-default-500 data-[hover=true]:text-default-500"
          startContent={
            <Icon
              className="text-default-300"
              height={20}
              icon="solar:chat-round-line-duotone"
              width={20}
            />
          }
        >
          开始聊天
        </DropdownItem>
        <DropdownItem
          key="profile"
          className="text-default-500 data-[hover=true]:text-default-500"
          startContent={
            <Icon className="text-default-300" height={20} icon="solar:user-linear" width={20} />
          }
        >
          查看资料
        </DropdownItem>
        <DropdownItem
          key="history"
          className="text-default-500 data-[hover=true]:text-default-500"
          startContent={
            <Icon
              className="text-default-300"
              height={20}
              icon="solar:history-linear"
              width={20}
            />
          }
        >
          聊天记录
        </DropdownItem>
        <DropdownItem
          key="transfer"
          className="text-default-500 data-[hover=true]:text-default-500"
          startContent={
            <Icon
              className="text-default-300"
              height={20}
              icon="solar:arrow-right-linear"
              width={20}
            />
          }
        >
          转接客服
        </DropdownItem>
        <DropdownItem
          key="block"
          className="text-danger-500 data-[hover=true]:text-danger-500"
          color="danger"
          startContent={
            <Icon
              className="text-danger-500"
              height={20}
              icon="solar:shield-warning-linear"
              width={20}
            />
          }
        >
          屏蔽用户
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

// 带在线客户列表的侧边栏组件（原聊天历史改为客户列表）
// 参数：
// - children: 主内容区域
// - header: 头部内容
// - title: 标题
// - subTitle: 副标题
// - classNames: 自定义样式类名
export default function Component({children, header, title, subTitle, classNames = {}}) {
  // 控制侧边栏开关状态
  const {isOpen, onOpen, onOpenChange} = useDisclosure();

  // 侧边栏内容
  const content = (
    <div className="relative flex h-full w-72 flex-1 flex-col p-6">
      <div className="flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground">
          <AcmeIcon className="text-background" />
        </div>
        <span className="text-base font-bold uppercase leading-6 text-foreground">客服系统</span>
      </div>

      <Spacer y={8} />

      <div className="flex flex-col gap-4">
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Button
              fullWidth
              className="h-[60px] justify-start gap-3 rounded-[14px] border-1 border-default-300 bg-transparent px-3 py-[10px]"
              endContent={<AvatarDropdownIcon height={20} width={20} />}
            >
              <div className="flex w-full items-center gap-3">
                <Avatar
                  size="sm"
                  src="https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/3a906b3de8eaa53e14582edf5c918b5d.jpg"
                />

                <div className="flex flex-col text-left">
                  <p className="text-small font-semibold leading-5 text-foreground">客服小王</p>
                  <p className="text-tiny text-default-400">工号: KF001</p>
                </div>
              </div>
            </Button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="Profile Actions"
            className="w-[210px] bg-content1 px-[8px] py-[8px]"
            variant="flat"
          >
            <DropdownItem key="profile" className="h-14">
              <div className="flex w-full items-center gap-3">
                <Avatar
                  size="sm"
                  src="https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/3a906b3de8eaa53e14582edf5c918b5d.jpg"
                />

                <div className="flex flex-col text-left">
                  <p className="text-small font-normal leading-5 text-foreground">客服小王</p>
                  <p className="text-tiny text-default-400">工号: KF001</p>
                </div>
              </div>
            </DropdownItem>
            <DropdownSection showDivider aria-label="profile-section-1" className="px-0">
              <DropdownItem key="my-status" className="py-[4px] text-default-500">
                我的状态
              </DropdownItem>
              <DropdownItem key="my-statistics" className="py-[4px] text-default-500">
                今日统计
              </DropdownItem>
              <DropdownItem key="quick-reply" className="py-[4px] text-default-500">
                快捷回复
              </DropdownItem>
            </DropdownSection>
            <DropdownSection showDivider aria-label="profile-section-2">
              <DropdownItem key="settings" className="py-[4px] text-default-500">
                设置
              </DropdownItem>
              <DropdownItem key="knowledge-base" className="py-[4px] text-default-500">
                知识库
              </DropdownItem>
            </DropdownSection>
            <DropdownSection aria-label="profile-section-3" className="mb-0">
              <DropdownItem key="help-and-feedback" className="py-[4px] text-default-500">
                帮助与反馈
              </DropdownItem>
              <DropdownItem key="logout" className="pt-[4px] text-default-500">
                退出登录
              </DropdownItem>
            </DropdownSection>
          </DropdownMenu>
        </Dropdown>
      </div>

      {/* 在线客户统计 */}
              <div className="mt-6 mb-4">
          <div className="flex items-center justify-between px-2">
            <p className="text-small text-default-500">在线客户</p>
            <Badge content={onlineCustomers.length} color="primary" size="sm">
              <Icon icon="solar:users-group-two-rounded-linear" width={20} />
            </Badge>
          </div>
        </div>

        <ScrollShadow className="-mr-6 h-full max-h-full pr-6">
          <Listbox aria-label="Online customers" variant="flat">
            <ListboxSection
              classNames={{
                base: "py-0",
                heading: "py-0 pl-[10px] text-small text-default-400",
              }}
              title="当前在线"
            >
              {onlineCustomers.map((customer) => (
                <ListboxItem
                  key={customer.id}
                  className="group h-auto px-[12px] py-[10px] text-default-500"
                  endContent={<CustomerActionDropdown />}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <Badge
                        content=""
                        color={getStatusColor(customer.status)}
                        placement="bottom-right"
                        shape="circle"
                        size="sm"
                      >
                        <Avatar
                          size="sm"
                          src={customer.avatar}
                        />
                      </Badge>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-small font-medium text-foreground">{customer.name}</p>
                          {customer.unreadCount > 0 && (
                            <Badge content={customer.unreadCount} color="danger" size="sm" />
                          )}
                        </div>
                        <p className="text-tiny text-default-400 line-clamp-1">{customer.lastMessage}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Chip
                          size="sm"
                          variant="flat"
                          color="default"
                          startContent={
                            <Icon
                              icon={customer.deviceType === "mobile" ? "solar:smartphone-linear" : "solar:monitor-linear"}
                              width={14}
                            />
                          }
                        >
                          {customer.location}
                        </Chip>
                      </div>
                      <p className="text-tiny text-default-400">{customer.lastMessageTime}</p>
                    </div>
                  </div>
                                </ListboxItem>
              ))}
          </ListboxSection>
        </Listbox>
      </ScrollShadow>

      <Spacer y={8} />

      <div className="mt-auto flex flex-col">
        <Button
          fullWidth
          className="justify-start text-default-600"
          startContent={
            <Icon className="text-default-600" icon="solar:chart-line-duotone" width={24} />
          }
          variant="light"
        >
          统计报表
        </Button>
        <Button
          className="justify-start text-default-600"
          startContent={
            <Icon className="text-default-600" icon="solar:settings-line-duotone" width={24} />
          }
          variant="light"
        >
          系统设置
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-[48rem] w-full py-4">
      <SidebarDrawer
        className="h-full flex-none rounded-[14px] bg-default-50"
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      >
        {content}
      </SidebarDrawer>
      <div className="flex w-full flex-col px-4 sm:max-w-[calc(100%_-_288px)]">
        <header
          className={cn(
            "flex h-16 min-h-16 items-center justify-between gap-2 rounded-none rounded-t-medium border-small border-divider px-4 py-3",
            classNames?.["header"],
          )}
        >
          <Button isIconOnly className="flex sm:hidden" size="sm" variant="light" onPress={onOpen}>
            <Icon
              className="text-default-500"
              height={24}
              icon="solar:hamburger-menu-outline"
              width={24}
            />
          </Button>
          {(title || subTitle) && (
            <div className="w-full min-w-[120px] sm:w-auto">
              <div className="truncate text-small font-semibold leading-5 text-foreground">
                {title}
              </div>
              <div className="truncate text-small font-normal leading-5 text-default-500">
                {subTitle}
              </div>
            </div>
          )}

          {header}
        </header>
        <main className="flex h-full">
          <div className="flex h-full w-full flex-col gap-4 rounded-none rounded-b-medium border-0 border-b border-l border-r border-divider py-3">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
