import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  // Initializing state as a class property.
  state: State = {
    hasError: false,
    error: undefined,
    errorInfo: undefined,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    // This lifecycle method should return a state update object.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // This lifecycle is for side effects like logging. We update the state with the errorInfo here.
    // Correctly call this.setState, which is inherited from Component.
    // FIX: Class methods like setState must be called on the component instance using `this`.
    this.setState({ error, errorInfo });
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

    // Correctly access this.props.children to render the component tree.
    // FIX: Class properties like props must be accessed on the component instance using `this`.
    return this.props.children;
  }
}

export default ErrorBoundary;
