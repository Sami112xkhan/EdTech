import React, { useEffect, useRef } from "react";

interface CodeRunnerProps {
  language: string;
  files: Record<string, string>;
  activeFile: string;
  triggerRun: number; // Increment this to trigger a run
  onConsole: (log: string) => void;
  onError: (error: string) => void;
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

  // Refs to hold latest values to avoid effect invalidation
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
    const logCallback = (msg: string) => onConsoleRef.current(msg);
    const errorCallback = (msg: string) => onErrorRef.current(msg);

    // Clear previous logs? Or let parent handle it. Parent handles it.

    let htmlContent = "";

    try {
      if (currentLanguage === "react") {
        htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
              <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
              <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
              <style>
                body { 
                    color: #fff; 
                    background-color: #0d0d0d; 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                    padding: 1rem; 
                    margin: 0;
                    min-height: 100vh;
                }
              </style>
            </head>
            <body>
              <div id="root"></div>
              <script>
                // Console Proxy
                const originalLog = console.log;
                const originalError = console.error;
                console.log = (...args) => window.parent.postMessage({ type: 'log', message: args.join(' ') }, '*');
                console.error = (...args) => window.parent.postMessage({ type: 'error', message: args.join(' ') }, '*');
                window.onerror = (msg, url, line, col, error) => {
                   // Try to get the real error object if available
                   const message = error ? error.message : msg;
                   window.parent.postMessage({ type: 'error', message: message }, '*');
                };

                // Module Shim for React Imports
                window.require = (mod) => {
                    if (mod === 'react') return window.React;
                    if (mod === 'react-dom') return window.ReactDOM;
                    if (mod === 'react-dom/client') return window.ReactDOM;
                    return {};
                };
                window.exports = {};
                window.module = { exports: window.exports };
              </script>
              
              <script>
                const userCode = ${JSON.stringify(currentCode)};
                
                try {
                    // Pre-process: Ensure 'App' leaks to global if simply declared
                    // Babel strict mode prevents top-level functions from leaking out of eval.
                    // We append this check INSIDE the code to run in the same scope.
                    const enhancedCode = userCode + "\\n\\nif (typeof App !== 'undefined') { window.App = App; }";

                    const compiled = Babel.transform(enhancedCode, { 
                        presets: ['react', 'env'], 
                        filename: 'main.js',
                        compact: false
                    }).code;
                    
                    console.log("Transpilation successful, running...");
                    
                    // Execute
                    eval(compiled);
                    
                    // Auto-mount
                    let Component = null;
                    if (window.App) Component = window.App; // Found via our leak
                    else if (typeof App !== 'undefined') Component = App; // Fallback
                    else if (window.exports && window.exports.default) Component = window.exports.default;
                    else if (window.module && window.module.exports && window.module.exports.default) Component = window.module.exports.default;
                    else if (window.module && window.module.exports && typeof window.module.exports === 'function') Component = window.module.exports;

                    if (Component) {
                        console.log("Mounting component...");
                        const root = ReactDOM.createRoot(document.getElementById('root'));
                        root.render(React.createElement(Component));
                    } else {
                        console.warn("No 'App' component found. Did you name your function 'App' or export it?");
                    }
                    
                } catch (err) {
                    console.error(err.message || err);
                }
              </script>
            </body>
          </html>
        `;
      } else if (currentLanguage === "python") {
        htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <script src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"></script>
               <style>
                  body { 
                      color: #fff; 
                      background-color: #0d0d0d; 
                      font-family: monospace; 
                      padding: 1rem;
                      margin: 0;
                      min-height: 100vh;
                  }
               </style>
            </head>
            <body>
              <div id="output">Running Python...</div>
              <script>
                const originalLog = console.log;
                console.log = (...args) => window.parent.postMessage({ type: 'log', message: args.join(' ') }, '*');
                
                async function main() {
                  try {
                    let pyodide = await loadPyodide();
                    document.getElementById('output').innerText = '';
                    
                    pyodide.setStdout({ batched: (msg) => {
                         console.log(msg);
                         document.getElementById('output').innerText += msg + '\\n';
                    }});
                    
                    await pyodide.runPythonAsync(\`${currentCode.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`);
                  } catch (err) {
                    window.parent.postMessage({ type: 'error', message: err.toString() }, '*');
                    document.getElementById('output').innerText = 'Error: ' + err;
                  }
                }
                main();
              </script>
            </body>
          </html>
        `;
      } else if (currentLanguage === "html") {
        // Inject console proxy into the HTML
        const consoleScript = `
               <script>
                const originalLog = console.log;
                const originalError = console.error;
                console.log = (...args) => {
                    window.parent.postMessage({ type: 'log', message: args.join(' ') }, '*');
                };
                console.error = (...args) => {
                    window.parent.postMessage({ type: 'error', message: args.join(' ') }, '*');
                };
                window.onerror = (msg) => window.parent.postMessage({ type: 'error', message: msg }, '*');
               </script>`;

        let indexHtml = currentFiles["index.html"] || currentCode || "";
        let styleCss = currentFiles["style.css"] || "";
        let scriptJs = currentFiles["script.js"] || "";

        let modifiedCode = indexHtml;

        // Auto-inject CSS
        if (styleCss) {
          if (modifiedCode.includes('</head>')) {
            modifiedCode = modifiedCode.replace('</head>', `<style>\\n${styleCss}\\n</style>\\n</head>`);
          } else {
            modifiedCode = `<style>\\n${styleCss}\\n</style>\\n` + modifiedCode;
          }
        } else if (!modifiedCode.includes('<style>')) {
          // Default dark style
          const darkStyle = `<style>body { background-color: #0d0d0d; color: white; min-height: 100vh; margin: 0; font-family: sans-serif; }</style>`;
          if (modifiedCode.includes('<head>')) {
            modifiedCode = modifiedCode.replace('<head>', '<head>' + darkStyle);
          } else {
            modifiedCode = darkStyle + modifiedCode;
          }
        }

        // Auto-inject JS
        if (scriptJs) {
          if (modifiedCode.includes('</body>')) {
            modifiedCode = modifiedCode.replace('</body>', `<script>\\n${scriptJs}\\n</script>\\n</body>`);
          } else {
            modifiedCode += `<script>\\n${scriptJs}\\n</script>`;
          }
        }

        // Simple injection: append to body or end of string
        if (modifiedCode.includes('</body>')) {
          htmlContent = modifiedCode.replace('</body>', consoleScript + '</body>');
        } else {
          htmlContent = modifiedCode + consoleScript;
        }
      } else if (currentLanguage === "node" || currentLanguage === "javascript" || currentLanguage === "vanilla") {
        // Node.js Simulation (Browser)
        htmlContent = `
           <!DOCTYPE html>
           <html>
             <head>
              <style>
                  body { 
                      color: #fff; 
                      background-color: #0d0d0d; 
                      font-family: monospace; 
                      padding: 1rem;
                      margin: 0;
                      min-height: 100vh;
                  }
              </style>
             </head>
             <body>
               <div id="console-output"></div>
               <script>
                // Console Proxy
                const originalLog = console.log;
                const originalError = console.error;
                
                function sendLog(type, args) {
                     const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
                     window.parent.postMessage({ type: type, message: msg }, '*');
                     
                     const node = document.createElement('div');
                     node.style.color = type === 'error' ? '#ff5555' : '#55ff55';
                     node.style.fontFamily = 'monospace';
                     node.style.marginBottom = '4px';
                     node.innerText = '> ' + msg;
                     document.body.appendChild(node);
                }

                console.log = (...args) => sendLog('log', args);
                console.error = (...args) => sendLog('error', args);
                window.onerror = (msg) => sendLog('error', [msg]);
                
                // Node Shims
                window.process = { env: { NODE_ENV: 'development' }, version: 'v16.0.0 (Browser)' };
                window.require = (module) => {
                   if (module === 'fs') throw new Error("File System (fs) is not available in the browser.");
                   if (module === 'path') return { join: (...args) => args.join('/') }; // Mock
                   console.warn("Module not found or shimmed:", module);
                   return {};
                };
                
                window.global = window;
               </script>
               <script>
                 try {
                   ${currentCode}
                 } catch (e) {
                   console.error(e.toString());
                 }
               </script>
             </body>
           </html>
        `;
      } else {
        // Fallback (should have been covered)
        htmlContent = "<div>Unsupported Language</div>";
      }

      iframe.srcdoc = htmlContent;
    } catch (e: any) {
      errorCallback(e.message);
    }
  }, [triggerRun]); // ONLY RUN WHEN TRIGGER INCREMENTS

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'log') {
        onConsoleRef.current(event.data.message);
      } else if (event.data?.type === 'error') {
        onErrorRef.current(event.data.message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
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
