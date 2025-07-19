import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

/**
 * 客户端应用入口文件
 * 使用 React 18 的 createRoot API
 * 启用严格模式以帮助发现潜在问题
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)