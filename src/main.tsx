import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App'; // استيراد App من المجلد الرئيسي (حيث يوجد التصميم الكامل)

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// صائد أخطاء بسيط
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
      return <div style={{padding: 20, color: 'red'}}><h1>حدث خطأ في التطبيق:</h1><pre>{this.state.error?.toString()}</pre></div>;
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
