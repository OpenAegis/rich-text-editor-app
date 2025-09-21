import { useState } from 'react';

interface AppManagementProps {
  appBridge: any;
  saleorApiUrl?: string;
}

const AppManagement = ({ appBridge, saleorApiUrl = 'https://api.lzsm.shop/graphql/' }: AppManagementProps) => {
  const [isLoading, setIsLoading] = useState(false);


  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/app-management?action=update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          saleorApiUrl: saleorApiUrl
        }),
      });

      const result = await response.json();

      if (result.success) {
        appBridge.dispatch({
          type: "notification",
          payload: {
            actionId: "update-success",
            status: "success",
            title: "应用已更新",
            text: `应用已更新到版本 ${result.version || '最新版本'}`
          }
        });
      } else {
        throw new Error(result.message || '更新失败');
      }
    } catch (error: any) {
      console.error('Update error:', error);
      appBridge.dispatch({
        type: "notification",
        payload: {
          actionId: "update-error",
          status: "error",
          title: "更新失败",
          text: error.message || '请稍后重试'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const buttonStyle = {
    padding: '8px 16px',
    margin: '0 5px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s'
  };

  const updateButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#007cba',
    color: 'white'
  };


  const disabledButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#6c757d',
    color: 'white',
    cursor: 'not-allowed'
  };

  return (
    <div style={{ 
      marginTop: '20px', 
      padding: '15px', 
      border: '1px solid #e0e0e0', 
      borderRadius: '6px',
      backgroundColor: '#f8f9fa'
    }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#333' }}>
        应用管理
      </h3>
      
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={handleUpdate}
          disabled={isLoading}
          style={isLoading ? disabledButtonStyle : updateButtonStyle}
          onMouseOver={(e) => {
            if (!isLoading) {
              (e.target as HTMLElement).style.backgroundColor = '#0056b3';
            }
          }}
          onMouseOut={(e) => {
            if (!isLoading) {
              (e.target as HTMLElement).style.backgroundColor = '#007cba';
            }
          }}
        >
          {isLoading ? '处理中...' : '更新应用'}
        </button>

        <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>
          当前版本: v1.0.0
        </span>
      </div>

      <p style={{ 
        fontSize: '12px', 
        color: '#666', 
        margin: '10px 0 0 0',
        lineHeight: '1.4'
      }}>
        • 更新应用：刷新应用配置和权限<br/>
        • 卸载应用：请使用 Saleor Dashboard 中的应用管理功能
      </p>
    </div>
  );
};

export default AppManagement;