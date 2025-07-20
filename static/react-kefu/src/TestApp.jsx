import React from "react";
import { Button } from "@heroui/react";

export default function TestApp() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>测试页面</h1>
      <p>这是一个简单的测试页面，用于调试问题。</p>
      <Button color="primary">测试按钮</Button>
    </div>
  );
}