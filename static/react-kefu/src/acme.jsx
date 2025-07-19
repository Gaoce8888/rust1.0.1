import React from "react";

// Acme 公司的 Logo 图标组件
// 参数：
// - size: 图标大小（默认32）
// - width: 宽度（优先使用size）
// - height: 高度（优先使用size）
// - 其他props会传递给svg元素
export const AcmeIcon = ({size = 32, width, height, ...props}) => (
  <svg fill="none" height={size || height} viewBox="0 0 32 32" width={size || width} {...props}>
    <path
      clipRule="evenodd"
      d="M17.6482 10.1305L15.8785 7.02583L7.02979 22.5499H10.5278L17.6482 10.1305ZM19.8798 14.0457L18.11 17.1983L19.394 19.4511H16.8453L15.1056 22.5499H24.7272L19.8798 14.0457Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);
