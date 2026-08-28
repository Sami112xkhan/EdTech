import React, { useEffect, useRef } from "react";

interface CodeRunnerProps {
  language: string;
  files: Record<string, string>;
  activeFile: string;
  triggerRun: number;
  onConsole: (log: string) => void;
  onError: (error: string) => void;
}

function preprocessReactCode(code: string): string {
  let result = code;
  // Convert 'import React, { X } from "Y"' (default + named) — must be first
  result = result.replace(
    /import\s+(\w+)\s*,\s*\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g,
    'const $1 = require("$3"); const {$2} = require("$3")'
  );
  // Convert 'import { X, Y } from "Z"' (named only)
  result = result.replace(
    /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g,
    'const {$1} = require("$2")'
  );
  // Convert 'import X from "Y"' (default only)
  result = result.replace(
    /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
    'const $1 = require("$2")'
  );
  // Convert 'export default X' to window.App = X
  result = result.replace(/export\s+default\s+/g, "window.App = ");
  // Convert 'export const/let/var/function/class' to just the keyword
  result = result.replace(/export\s+(const|let|var|function|class)\s+/g, "$1 ");
  result += "\n\nif (typeof App !== 'undefined' && !window.App) { window.App = App; }";
  return result;
}

export const CodeRunner: React.FC<CodeRunnerProps> = ({
  language,
  files,
  activeFile,
  triggerRun,
  onConsole,
  onError
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const filesRef = useRef(files);
  const activeFileRef = useRef(activeFile);
  const languageRef = useRef(language);
  const onConsoleRef = useRef(onConsole);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    filesRef.current = files;
    activeFileRef.current = activeFile;
    languageRef.current = language;
    onConsoleRef.current = onConsole;
    onErrorRef.current = onError;
  }, [files, activeFile, language, onConsole, onError]);

  useEffect(() => {
    if (!triggerRun) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const currentFiles = filesRef.current;
    const currentActiveFile = activeFileRef.current;
    const currentCode = currentFiles[currentActiveFile] || "";
    const currentLanguage = languageRef.current;

    let htmlContent = "";

    try {
      if (currentLanguage === "react") {
        // Pre-process in TypeScript — converts imports to require(), exports to window.App
        const processedCode = preprocessReactCode(currentCode);

        // Build HTML as array of parts, then join — avoids any inline </script> issues
        const parts: string[] = [];
        parts.push('<!DOCTYPE html>\n<html>\n<head>\n');
        parts.push('<script src="https://unpkg.com/@babel/standalone/babel.min.js"></');
        parts.push('script>\n');
        parts.push('<script src="https://unpkg.com/react@18/umd/react.development.js"></');
        parts.push('script>\n');
        parts.push('<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></');
        parts.push('script>\n');
        parts.push("<style>\n");
        parts.push("  body { color: #fff; background-color: #0d0d0d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 1rem; margin: 0; min-height: 100vh; }\n");
        parts.push("</style>\n</head>\n<body>\n");
        parts.push('  <div id="root"></div>\n');

        // Setup script: console proxy + require shim
        parts.push('<script>\n');
        parts.push("  console.log = (...args) => window.parent.postMessage({ type: 'log', message: args.join(' ') }, '*');\n");
        parts.push("  console.error = (...args) => window.parent.postMessage({ type: 'error', message: args.join(' ') }, '*');\n");
        parts.push("  window.onerror = (msg, url, line, col, error) => {\n");
        parts.push("    window.parent.postMessage({ type: 'error', message: error ? error.message : msg }, '*');\n");
        parts.push("  };\n");
        parts.push("  window.require = (mod) => {\n");
        parts.push("    if (mod === 'react') return window.React;\n");
        parts.push("    if (mod === 'react-dom') return window.ReactDOM;\n");
        parts.push("    if (mod === 'react-dom/client') return window.ReactDOM;\n");
        parts.push("    return {};\n");
        parts.push("  };\n");
        parts.push("  window.exports = {};\n");
        parts.push("  window.module = { exports: window.exports };\n");
        parts.push("</");
        parts.push("script>\n");

        // Run script: Babel transform + eval + auto-mount
        parts.push('<script>\n');
        parts.push("  try {\n");
        parts.push("    var __code = " + JSON.stringify(processedCode) + ";\n");
        parts.push("    var __compiled = Babel.transform(__code, { presets: ['react'], filename: 'main.js', compact: false }).code;\n");
        parts.push("    console.log('Transpilation successful, running...');\n");
        parts.push("    eval(__compiled);\n");
        parts.push("    var __Component = null;\n");
        parts.push("    if (window.App) __Component = window.App;\n");
        parts.push("    else if (typeof App !== 'undefined') __Component = App;\n");
        parts.push("    else if (window.exports && window.exports.default) __Component = window.exports.default;\n");
        parts.push("    else if (window.module && window.module.exports && window.module.exports.default) __Component = window.module.exports.default;\n");
        parts.push("    if (__Component) {\n");
        parts.push("      console.log('Mounting component...');\n");
        parts.push("      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(__Component));\n");
        parts.push("    } else {\n");
        parts.push('      console.warn("No \'App\' component found.");\n');
        parts.push("    }\n");
        parts.push("  } catch (err) {\n");
        parts.push("    console.error(err.message || err);\n");
        parts.push("  }\n");
        parts.push("</");
        parts.push("script>\n");

        parts.push("</body>\n</html>");
        htmlContent = parts.join("");

      } else if (currentLanguage === "python") {
        const escapedCode = currentCode
          .replace(/\\/g, "\\\\")
          .replace(/`/g, "\\`")
          .replace(/\$\{/g, "\\${");

        const parts: string[] = [];
        parts.push('<!DOCTYPE html>\n<html>\n<head>\n');
        parts.push('<script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js"></');
        parts.push('script>\n');
        parts.push("<style>\n  body { color: #fff; background-color: #0d0d0d; font-family: monospace; padding: 1rem; margin: 0; min-height: 100vh; }\n</style>\n");
        parts.push("</head>\n<body>\n");
        parts.push('  <div id="output">Running Python...</div>\n');
        parts.push("<script>\n");
        parts.push("  console.log = (...args) => window.parent.postMessage({ type: 'log', message: args.join(' ') }, '*');\n");
        parts.push("  async function main() {\n");
        parts.push("    try {\n");
        parts.push("      let pyodide = await loadPyodide();\n");
        parts.push("      document.getElementById('output').innerText = '';\n");
        parts.push("      pyodide.setStdout({ batched: (msg) => {\n");
        parts.push("        console.log(msg);\n");
        parts.push("        document.getElementById('output').innerText += msg + '\\n';\n");
        parts.push("      }});\n");
        parts.push("      await pyodide.runPythonAsync(`" + escapedCode + "`);\n");
        parts.push("    } catch (err) {\n");
        parts.push("      window.parent.postMessage({ type: 'error', message: err.toString() }, '*');\n");
        parts.push("      document.getElementById('output').innerText = 'Error: ' + err;\n");
        parts.push("    }\n");
        parts.push("  }\n");
        parts.push("  main();\n");
        parts.push("</");
        parts.push("script>\n");
        parts.push("</body>\n</html>");
        htmlContent = parts.join("");

      } else if (currentLanguage === "html") {
        let indexHtml = currentFiles["index.html"] || currentCode || "";
        let styleCss = currentFiles["style.css"] || "";
        let scriptJs = currentFiles["script.js"] || "";

        let modifiedCode = indexHtml;

        if (styleCss) {
          if (modifiedCode.includes("</head>")) {
            modifiedCode = modifiedCode.replace("</head>", "<style>\n" + styleCss + "\n</style>\n</head>");
          } else {
            modifiedCode = "<style>\n" + styleCss + "\n</style>\n" + modifiedCode;
          }
        } else if (!modifiedCode.includes("<style>")) {
          const darkStyle = "<style>body { background-color: #0d0d0d; color: white; min-height: 100vh; margin: 0; font-family: sans-serif; }</style>";
          if (modifiedCode.includes("<head>")) {
            modifiedCode = modifiedCode.replace("<head>", "<head>" + darkStyle);
          } else {
            modifiedCode = darkStyle + modifiedCode;
          }
        }

        if (scriptJs) {
          if (modifiedCode.includes("</body>")) {
            modifiedCode = modifiedCode.replace("</body>", "<script>\n" + scriptJs + "\n</script>\n</body>");
          } else {
            modifiedCode += "<script>\n" + scriptJs + "\n</script>";
          }
        }

        const consoleParts: string[] = [];
        consoleParts.push("<script>\n");
        consoleParts.push("  console.log = (...args) => window.parent.postMessage({ type: 'log', message: args.join(' ') }, '*');\n");
        consoleParts.push("  console.error = (...args) => window.parent.postMessage({ type: 'error', message: args.join(' ') }, '*');\n");
        consoleParts.push("  window.onerror = (msg) => window.parent.postMessage({ type: 'error', message: msg }, '*');\n");
        consoleParts.push("</");
        consoleParts.push("script>");
        const consoleScript = consoleParts.join("");

        if (modifiedCode.includes("</body>")) {
          htmlContent = modifiedCode.replace("</body>", consoleScript + "</body>");
        } else {
          htmlContent = modifiedCode + consoleScript;
        }
      } else if (currentLanguage === "node" || currentLanguage === "javascript" || currentLanguage === "vanilla") {
        const parts: string[] = [];
        parts.push('<!DOCTYPE html>\n<html>\n<head>\n');
        parts.push("<style>\n  body { color: #fff; background-color: #0d0d0d; font-family: monospace; padding: 1rem; margin: 0; min-height: 100vh; }\n</style>\n");
        parts.push("</head>\n<body>\n");
        parts.push('  <div id="console-output"></div>\n');
        parts.push("<script>\n");
        parts.push("  function sendLog(type, args) {\n");
        parts.push("    var msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');\n");
        parts.push("    window.parent.postMessage({ type: type, message: msg }, '*');\n");
        parts.push("    var node = document.createElement('div');\n");
        parts.push("    node.style.color = type === 'error' ? '#ff5555' : '#55ff55';\n");
        parts.push("    node.style.fontFamily = 'monospace';\n");
        parts.push("    node.style.marginBottom = '4px';\n");
        parts.push("    node.innerText = '> ' + msg;\n");
        parts.push("    document.body.appendChild(node);\n");
        parts.push("  }\n");
        parts.push("  console.log = (...args) => sendLog('log', args);\n");
        parts.push("  console.error = (...args) => sendLog('error', args);\n");
        parts.push("  window.onerror = (msg) => sendLog('error', [msg]);\n");
        parts.push("  window.process = { env: { NODE_ENV: 'development' }, version: 'v16.0.0 (Browser)' };\n");
        parts.push("  window.require = (module) => {\n");
        parts.push("    if (module === 'fs') throw new Error('fs not available in browser');\n");
        parts.push("    if (module === 'path') return { join: (...args) => args.join('/') };\n");
        parts.push("    return {};\n");
        parts.push("  };\n");
        parts.push("  window.global = window;\n");
        parts.push("</");
        parts.push("script>\n");
        parts.push("<script>\n");
        parts.push("  try {\n");
        parts.push("    " + currentCode + "\n");
        parts.push("  } catch (e) {\n");
        parts.push("    console.error(e.toString());\n");
        parts.push("  }\n");
        parts.push("</");
        parts.push("script>\n");
        parts.push("</body>\n</html>");
        htmlContent = parts.join("");
      } else {
        htmlContent = "<div>Unsupported Language</div>";
      }

      // Use Blob URL instead of srcdoc to avoid HTML parser issues
      const blob = new Blob([htmlContent], { type: "text/html" });
      const blobUrl = URL.createObjectURL(blob);

      // Clean up previous blob URL
      const prevUrl = iframe.getAttribute("src");
      if (prevUrl && prevUrl.startsWith("blob:")) {
        URL.revokeObjectURL(prevUrl);
      }

      iframe.src = blobUrl;
    } catch (e: any) {
      onError(e.message);
    }
  }, [triggerRun]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "log") {
        onConsoleRef.current(event.data.message);
      } else if (event.data?.type === "error") {
        onErrorRef.current(event.data.message);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      title="code-runner"
      className="w-full h-full border-none bg-black/50"
      sandbox="allow-scripts allow-same-origin allow-modals"
    />
  );
};
