import React from "react";
import Editor from "@monaco-editor/react";

// Configure Monaco Loader (optional, can use CDN default)
// Loader.config({ ... });

interface MonacoEditorProps {
    language: string;
    value: string;
    onChange: (value: string | undefined) => void;
    theme?: "vs-dark" | "light";
    transparent?: boolean;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
    language,
    value,
    onChange,
    theme = "vs-dark",
    transparent = false
}) => {
    const handleEditorWillMount = (monaco: any) => {
        monaco.editor.defineTheme('glass-theme', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#00000000', // Transparent
            }
        });
    };

    return (
        <div className={`h-full w-full overflow-hidden rounded-xl border border-white/10 shadow-2xl ${transparent ? "" : "bg-[#1e1e1e]"}`}>
            <Editor
                height="100%"
                width="100%"
                language={language}
                value={value}
                theme={transparent ? 'glass-theme' : theme}
                beforeMount={handleEditorWillMount}
                onChange={onChange}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontLigatures: true,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 16, bottom: 16 },
                    roundedSelection: false,
                    cursorStyle: "line",
                    cursorBlinking: "smooth",
                    smoothScrolling: true,
                    contextmenu: true,
                }}
            />
        </div>
    );
};
