import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends React.Component<Props, State> {
  // FIX: Use class property initialization for state. This resolves all
  // TypeScript errors related to 'state', 'setState', and 'props' not being
  // found on the component instance. This also fixes the props issue in index.tsx
  // by ensuring the component is correctly typed.
  public state: State = {
    hasError: false,
    error: undefined,
    errorInfo: undefined,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-200 p-8">
          <div className="max-w-2xl w-full text-center bg-gray-800 p-8 rounded-lg border border-red-500 shadow-2xl">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Đã xảy ra lỗi nghiêm trọng</h1>
            <p className="text-gray-300 mb-6">
              Ứng dụng đã gặp phải một sự cố không mong muốn. Vui lòng thử tải lại trang. Nếu sự cố vẫn tiếp diễn, hãy kiểm tra console của trình duyệt (F12) để biết thêm chi tiết.
            </p>
            <details className="text-left bg-gray-900 p-4 rounded-md text-red-300 text-xs overflow-auto mb-6 cursor-pointer">
                <summary className="font-semibold select-none">Chi tiết lỗi</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                    {this.state.error?.toString()}
                    {this.state.errorInfo?.componentStack}
                </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
