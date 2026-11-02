import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/teacher/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 max-w-lg w-full text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-3xl mx-auto shadow-inner">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Kutilmagan xatolik yuz berdi
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Tizimda kichik nosozlik yuz berdi. Sahifani qayta yuklab ko'ring yoki bosh sahifaga qayting.
              </p>
            </div>

            {this.state.error && (
              <details className="text-left bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-32">
                <summary className="font-semibold cursor-pointer text-gray-700 dark:text-gray-300">
                  Xatolik tafsilotlari
                </summary>
                <p className="mt-2 font-mono text-rose-500">
                  {this.state.error?.toString()}
                </p>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-rotate-right"></i>
                Sahifani yangilash
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 py-3 px-5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-sm transition active:scale-95 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-house"></i>
                Bosh sahifa
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
