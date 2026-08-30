import React from "react";

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h1 className="text-xl font-bold text-white">Something went wrong</h1>
                        <p className="text-sm text-muted-foreground">
                            The page encountered an error and couldn't render. Please try refreshing.
                        </p>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                            className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                        >
                            Reload Page
                        </button>
                        {this.state.error && (
                            <details className="text-left mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
                                <summary className="text-xs text-muted-foreground cursor-pointer font-bold">
                                    Error details
                                </summary>
                                <pre className="text-[10px] text-red-400 mt-2 overflow-auto">
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
