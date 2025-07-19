
// React应用的入口文件
import React from "react";
import ReactDOM from "react-dom/client";
import {HeroUIProvider} from "@heroui/react";
import App from "./App";
// import App from "./TestApp";
import "./styles.css";

// 创建React根节点并渲染应用
ReactDOM.createRoot(document.getElementById("root")).render(
  // React严格模式，用于检测潜在问题
  <React.StrictMode>
    {/* HeroUI组件库的Provider，提供主题和样式 */}
    <HeroUIProvider>
      <App />  
    </HeroUIProvider>
  </React.StrictMode>
);