
import React, { useState, useEffect } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  useSandpack
} from "@codesandbox/sandpack-react";
import { motion, AnimatePresence } from "motion/react";
import { Code, Terminal, Box, Play, Layers, Save, FolderOpen, Plus, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const SaveButton: React.FC<{ email: string; name: string; type: string; currentProjectId: string | null; setProjectId: (id: string) => void; onSave: () => void }> = ({ email, name, type, currentProjectId, setProjectId, onSave }) => {
  const { sandpack } = useSandpack();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/playground/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          type,
          files: JSON.stringify(sandpack.files),
          projectId: currentProjectId
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (!currentProjectId) setProjectId(data.id);
        toast.success("Project Saved! 💾", {
          description: "Your code is now persisted in the cloud."
        });
        onSave();
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save project");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      onClick={handleSave}
      disabled={isSaving}
      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
    >
      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {isSaving ? "Saving..." : "Save Project"}
    </button>
  );
};

const PlaygroundPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTemplate, setActiveTemplate] = useState<"react" | "node" | "static">("react");
  const [projectName, setProjectName] = useState("New Project");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [showProjects, setShowProjects] = useState(false);
  const [customFiles, setCustomFiles] = useState<any>(null);

  const templates = {
    react: {
      name: "React",
      icon: Code,
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
    <p>This is a static page.</p>
  </div>
</body>
</html>`
      }
    }
  };

  const loadProjects = async () => {
    if (!user?.email) return;
    try {
      const response = await fetch(`/api/playground/list?email=${encodeURIComponent(user.email)}`);
      if (response.ok) {
        const data = await response.json();
        setSavedProjects(data);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user?.email]);

  const handleLoadProject = (project: any) => {
    setCurrentProjectId(project.id);
    setProjectName(project.name);
    setActiveTemplate(project.type);
    setCustomFiles(JSON.parse(project.files));
    setShowProjects(false);
  };

  const [resetKey, setResetKey] = useState(0);

  const handleNewProject = () => {
    setCurrentProjectId(null);
    setProjectName("New Project");
    setCustomFiles(null);
    setResetKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col relative overflow-hidden">
      <SandpackProvider
        key={`${activeTemplate}-${currentProjectId}-${resetKey}`}
        template={activeTemplate}
        theme="dark"
        files={customFiles || templates[activeTemplate].files}
        customSetup={{
          dependencies: {
            "lucide-react": "latest",
            "framer-motion": "latest"
          }
        }}
        options={{
          classes: {
            "sp-wrapper": "flex-1 flex flex-col",
            "sp-layout": "flex-1 flex",
            "sp-stack": "flex-1 flex flex-col",
          }
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 pb-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowProjects(!showProjects)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${showProjects
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-white/5 border-white/10 text-primary hover:bg-white/10"
                }`}
            >
              <FolderOpen className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest">Library</span>
            </button>
            <div>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="text-xl font-black bg-transparent border-none focus:outline-none text-white tracking-tighter placeholder:text-white/20 w-48"
                placeholder="Unnamed Project"
              />
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                  {activeTemplate}
                </span>
                {currentProjectId && (
                  <span className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Synced to Cloud
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-sm">
              {(Object.keys(templates) as Array<keyof typeof templates>).map((temp) => (
                <button
                  key={temp}
                  onClick={() => {
                    handleNewProject();
                    setActiveTemplate(temp);
                  }}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTemplate === temp
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-white"
                    }`}
                >
                  {templates[temp].name}
                </button>
              ))}
            </div>

            <button
              onClick={handleNewProject}
              className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white hover:scale-110 active:scale-90"
              title="Start New Project"
            >
              <Plus className="w-4 h-4" />
            </button>

            {user?.email && (
              <SaveButton
                email={user.email}
                name={projectName}
                type={activeTemplate}
                currentProjectId={currentProjectId}
                setProjectId={setCurrentProjectId}
                onSave={loadProjects}
              />
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 relative flex flex-col">
          <AnimatePresence>
            {showProjects && (
              <motion.div
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                className="absolute left-0 top-0 bottom-0 w-80 bg-[#151515]/95 border border-white/10 rounded-[2.5rem] z-50 p-6 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/50">Project Library</h3>
                  <button onClick={() => setShowProjects(false)} className="text-white/20 hover:text-white transition-colors">
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                  {savedProjects.length === 0 ? (
                    <div className="py-12 text-center">
                      <Box className="w-12 h-12 text-white/10 mx-auto mb-4" />
                      <p className="text-xs text-white/40 font-bold uppercase tracking-widest">No saved projects</p>
                    </div>
                  ) : (
                    savedProjects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleLoadProject(p)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all group ${currentProjectId === p.id
                            ? "bg-primary/10 border-primary/40"
                            : "bg-white/5 border-white/5 hover:border-primary/50 hover:bg-primary/5"
                          }`}
                      >
                        <h4 className="text-sm font-black text-white group-hover:text-primary transition-colors truncate">{p.name}</h4>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/30">{p.type}</span>
                          <span className="text-[9px] text-white/20">{new Date(p.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            layout
            className="flex-1 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-[#151515] flex flex-col"
          >
            <SandpackLayout
              className="flex-1 border-none bg-transparent"
              style={{ height: '100%', display: 'flex' }}
            >
              <SandpackCodeEditor
                showLineNumbers
                showInlineErrors
                className="h-full text-sm"
                style={{ height: '100%', flex: 1 }}
              />
              <SandpackPreview
                showNavigator
                className="h-full bg-white"
                style={{ height: '100%', flex: 1 }}
              />
            </SandpackLayout>
          </motion.div>
        </div>
      </SandpackProvider>
    </div>
  );
};

export default PlaygroundPage;
