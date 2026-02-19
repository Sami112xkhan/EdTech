import React, { useEffect } from "react";
import { SandpackProvider, useSandpack } from "@codesandbox/sandpack-react";

interface SandpackRootProps {
    template: string;
    files: Record<string, string>;
    pendingFiles: any | null;
    onSynchronized: () => void;
    children: React.ReactNode;
}

const FileSynchronizer: React.FC<{ files: any | null; onSynchronized: () => void }> = ({ files, onSynchronized }) => {
    const { sandpack } = useSandpack();

    useEffect(() => {
        if (files) {
            // Cast to any to avoid TS error if types are outdated
            (sandpack as any).updateFiles(files);
            onSynchronized();
        }
    }, [files, sandpack, onSynchronized]);

    return null;
};

class SandpackErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("Sandpack crashed:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-full w-full flex flex-col items-center justify-center bg-[#151515] text-white gap-4">
                    <h2 className="text-xl font-bold text-red-500">Editor Crashed</h2>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all"
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export const SandpackRoot: React.FC<SandpackRootProps> = ({
    template,
    files,
    pendingFiles,
    onSynchronized,
    children
}) => {
    return (
        <SandpackErrorBoundary>
            <SandpackProvider
                // STABLE KEY: Only remount if the template type changes.
                // Files are static defaults. Custom content is loaded via FileSynchronizer.
                key={template}
                template={template as any}
                theme="dark"
                files={files}
                customSetup={{
                    dependencies: {
                        "lucide-react": "latest",
                        "framer-motion": "latest",
                        "clsx": "latest",
                        "tailwind-merge": "latest"
                    }
                }}
                options={{
                    activeFile: template === 'python' ? '/main.py' : undefined,
                    classes: {
                        "sp-wrapper": "h-full flex flex-col",
                        "sp-layout": "h-full flex flex-row bg-[#151515] !rounded-none !border-none",
                        "sp-stack": "h-full flex flex-col",
                    },
                    externalResources: ["https://cdn.tailwindcss.com"]
                }}
                style={{ height: '100%' }}
            >
                <FileSynchronizer
                    files={pendingFiles}
                    onSynchronized={onSynchronized}
                />
                {children}
            </SandpackProvider>
        </SandpackErrorBoundary>
    );
};
