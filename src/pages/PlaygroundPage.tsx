
import React, { useState } from "react";
import { Sandpack } from "@codesandbox/sandpack-react";
import { motion } from "motion/react";
import { Code, Terminal, Box, Play, Layers } from "lucide-react";

const PlaygroundPage: React.FC = () => {
    const [activeTemplate, setActiveTemplate] = useState<"react" | "node" | "static">("react");

    const templates = {
        react: {
            name: "React",
            icon: Code,
            description: "Modern React with functional components and hooks",
            files: {
                "/App.js": `import React from "react";

export default function App() {
  return (
    <div style={{ 
      fontFamily: "system-ui, sans-serif", 
      textAlign: "center", 
      padding: "2rem",
      background: "#1a1a1a",
      color: "white",
      minHeight: "100vh"
    }}>
      <h1 style={{ 
        background: "linear-gradient(to right, #6366f1, #a855f7, #ec4899)", 
        WebkitBackgroundClip: "text", 
        color: "transparent",
        fontSize: "3rem",
        fontWeight: "900" 
      }}>
        Hello World!
      </h1>
      <p style={{ color: "#a1a1aa", fontSize: "1.2rem" }}>
        Start editing to see some magic happen!
      </p>
    </div>
  );
}`
            }
        },
        node: {
            name: "Node.js",
            icon: Terminal,
            description: "Server-side JavaScript environment",
            files: {
                "/index.js": `const http = require('http');

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello from Node.js Server!\\n');
});

const port = 3000;
server.listen(port, () => {
  console.log(\`Server running at port \${port}\`);
});`
            }
        },
        static: {
            name: "HTML/CSS",
            icon: Layers,
            description: "Static web pages with vanilla technologies",
            files: {
                "/index.html": `<!DOCTYPE html>
<html>
<head>
  <title>Static Page</title>
  <style>
    body {
      background: #000;
      color: white;
      font-family: sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    .card {
      background: rgba(255, 255, 255, 0.1);
      padding: 2rem;
      border-radius: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Vanilla HTML & CSS</h1>
    <p>This is a stati page.</p>
  </div>
</body>
</html>`
            }
        }
    };

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-white">
                        CODE <span className="text-primary">PLAYGROUND</span>
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Experiment with code in a secure, sandboxed environment.
                    </p>
                </div>

                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-sm self-start md:self-auto">
                    {(Object.keys(templates) as Array<keyof typeof templates>).map((temp) => {
                        const Icon = templates[temp].icon;
                        return (
                            <button
                                key={temp}
                                onClick={() => setActiveTemplate(temp)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTemplate === temp
                                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{templates[temp].name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <motion.div
                layout
                className="flex-1 rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#151515]"
            >
                <Sandpack
                    template={activeTemplate}
                    theme="dark"
                    files={templates[activeTemplate].files}
                    options={{
                        showNavigator: true,
                        showLineNumbers: true,
                        showInlineErrors: true,
                        wrapContent: true,
                        editorHeight: "100%",
                        classes: {
                            "sp-wrapper": "h-full",
                            "sp-layout": "h-full",
                            "sp-stack": "h-full",
                        }
                    }}
                    customSetup={{
                        dependencies: {
                            "lucide-react": "latest",
                            "framer-motion": "latest"
                        }
                    }}
                />
            </motion.div>
        </div>
    );
};

export default PlaygroundPage;
