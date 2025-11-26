import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App'; // استيراد التطبيق الرئيسي من الجذر

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// صائد أخطاء بسيط لمنع الشاشة البيضاء
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: 20, color: 'white', background: '#111827', height: '100vh', direction: 'rtl', textAlign: 'center'}}>
          <h1>عذراً، حدث خطأ في التشغيل.</h1>
          <p>يرجى التأكد من إعدادات الاتصال.</p>
          <pre style={{color: 'red', background: '#000', padding: 10, borderRadius: 5, direction: 'ltr', textAlign: 'left'}}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
