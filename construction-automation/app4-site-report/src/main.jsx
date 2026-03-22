import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import App from './App'
import './index.css'

const antTheme = {
  token: {
    colorPrimary: '#0d6efd',
    colorSuccess: '#198754',
    colorWarning: '#ffc107',
    colorError: '#dc3545',
    colorInfo: '#0dcaf0',
    colorTextBase: '#212529',
    colorBgBase: '#ffffff',
    // ... (paste your full token object here)
    borderRadius: 4,
    boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
  },
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider theme={antTheme}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
)