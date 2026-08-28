import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Code, Terminal, Box, Play, Layers, Save, FolderOpen, Plus, Loader2, Sparkles, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { curriculum } from "../data/curriculum";
import { useAuth } from "../context/AuthContext";
import { trackAction } from "../components/NavigationTracker";
import { toast } from "sonner";
import { MonacoEditor } from "../components/Playground/MonacoEditor";
import { CodeRunner } from "../components/Playground/CodeRunner";
import GlassSurface from "../components/GlassSurface";
import Prism from "../components/Playground/Prism";
import { useTheme, ACCENT_COLORS, BACKGROUND_CALIBRATION, ACCENT_RGB } from "../context/ThemeContext";

// --- Types ---
type TemplateType = "react" | "python" | "node" | "vanilla" | "html";

interface FileMap {
  [path: string]: string;
}

interface TemplateConfig {
  name: string;
  icon: React.ElementType;
  defaultFile: string;
  files: FileMap;
}

// --- Constants ---
const TEMPLATES: Record<TemplateType, TemplateConfig> = {
  react: {
    name: "React",
    icon: Code,
    defaultFile: "App.js", // Babel standalone handles JSX in .js
    files: {
      "App.js": `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ textAlign: 'center', padding: '2rem', color: '#fff' }}>
      <h1>Hello Monaco!</h1>
      <p>This is a React component running in the browser.</p>

      <button
        onClick={() => setCount(c => c + 1)}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          borderRadius: '8px',
          border: 'none',
          background: '#6d28d9',
          color: 'white',
          cursor: 'pointer'
        }}
      >
        Count is {count}
      </button>
    </div>
  );
}
`
    }
  },
  python: {
    name: "Python",
    icon: Terminal,
    defaultFile: "main.py",
    files: {
      "main.py": `print("Hello from Python!")

def factorial(n):
    if n == 0: return 1
    return n * factorial(n - 1)

print(f"Factorial of 5 is {factorial(5)}")
`
    }
  },
  node: {
    name: "Node.js (Web)",
    icon: Terminal,
    defaultFile: "index.js",
    files: {
      "index.js": `console.log("Hello from Node.js (Web)!");
console.log("Standard JS features work here.");

const data = [1, 2, 3, 4, 5];
const doubled = data.map(n => n * 2);
console.log("Doubled:", doubled);
`
    }
  },
  vanilla: {
    name: "JavaScript",
    icon: Code,
    defaultFile: "script.js",
    files: {
      "script.js": `console.log("Hello Vanilla JS!");
document.body.innerHTML += "<h1>Hello from JS</h1>";
`
    }
  },
  html: {
    name: "Web (HTML/JS/CSS)",
    icon: Layers,
    defaultFile: "index.html",
    files: {
      "index.html": `<!DOCTYPE html>
<html>
  <head>
    <title>My Web App</title>
  </head>
  <body>
    <h1>Hello Web!</h1>
    <p>Edit HTML, CSS, and JS in the tabs above.</p>
  </body>
</html>`,
      "style.css": `body {\n  background: #111;\n  color: white;\n  font-family: sans-serif;\n  padding: 1rem;\n}\n\nh1 {\n  color: #facc15;\n}`,
      "script.js": `console.log("Hello from JavaScript!");\nsetTimeout(() => {\n  console.log("Try editing the tabs and clicking run!");\n}, 1000);`
    }
  }
};

const PlaygroundPage: React.FC = () => {
  const { user } = useAuth();
  const { theme, accentColor } = useTheme();
  const isRich = theme === 'rich';

  // --- State ---
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>("react");

  // Use drafts so switching templates doesn't wipe unsaved code
  const [drafts, setDrafts] = useState<Record<TemplateType, FileMap>>({
    react: TEMPLATES.react.files,
    python: TEMPLATES.python.files,
    node: TEMPLATES.node.files,
    vanilla: TEMPLATES.vanilla.files,
    html: TEMPLATES.html.files
  });

  const files = drafts[activeTemplate];
  const [activeFile, setActiveFile] = useState<string>(TEMPLATES.react.defaultFile);
  const [triggerRun, setTriggerRun] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Projects
  const [showProjects, setShowProjects] = useState(false);
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("New Project");

  // Load Projects
  useEffect(() => {
    if (user?.email) {
      fetch(`/api/playground/list?email=${encodeURIComponent(user.email)}`)
        .then(res => res.json())
        .then(data => setSavedProjects(data))
        .catch(console.error);
    }
  }, [user?.email]);

  // --- Handlers ---
  const handleEditorChange = (val: string | undefined) => {
    if (val !== undefined) {
      setDrafts(prev => ({
        ...prev,
        [activeTemplate]: {
          ...prev[activeTemplate],
          [activeFile]: val
        }
      }));
    }
  };

  const handleRun = () => {
    setLogs([]); // Clear logs
    setError(null);
    setTriggerRun(n => n + 1);
  };

  const handleTemplateSwitch = (type: TemplateType) => {
    setActiveTemplate(type);

    // Check if we already have files in this draft
    const currentFiles = drafts[type];
    const firstFile = Object.keys(currentFiles)[0] || TEMPLATES[type].defaultFile;
    setActiveFile(firstFile);

    setCurrentProjectId(null);
    setProjectName("New Project");
    setLogs([]);
    setError(null);
    setTriggerRun(0);
  };

  const handleLoadProject = (p: any) => {
    try {
      const parsedFiles = JSON.parse(p.files);
      const type = p.type as TemplateType;

      setActiveTemplate(type);
      setDrafts(prev => ({
        ...prev,
        [type]: parsedFiles
      }));
      // Pick first file as active
      const firstFile = Object.keys(parsedFiles)[0] || TEMPLATES[type].defaultFile;
      setActiveFile(firstFile);

      setCurrentProjectId(p.id);
      setProjectName(p.name);
      setShowProjects(false);

    } catch (e) {
      console.error("Failed to load project files", e);
      toast.error("Corrupt project data");
    }
  };

  const handleNewProject = () => {
    setCurrentProjectId(null);
    setProjectName("New Project");
    setDrafts(prev => ({
      ...prev,
      [activeTemplate]: TEMPLATES[activeTemplate].files
    }));
    setActiveFile(TEMPLATES[activeTemplate].defaultFile);
    setLogs([]);
    setError(null);
    setTriggerRun(0);
    toast.info("Started new project");
  };

  const handleSaveProject = async () => {
    if (!user?.email) return;
    const toastId = toast.loading("Saving...");

    try {
      const res = await fetch('/api/playground/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: projectName,
          type: activeTemplate,
          files: JSON.stringify(files),
          projectId: currentProjectId
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentProjectId(data.id);
        toast.success("Saved!", { id: toastId });

        // Refresh list
        fetch(`/api/playground/list?email=${encodeURIComponent(user.email)}`)
          .then(r => r.json())
          .then(setSavedProjects);
      } else {
        throw new Error("API Error");
      }
    } catch (e) {
      toast.error("Save failed", { id: toastId });
    }
  };

  const accentRGB = ACCENT_RGB[accentColor] || ACCENT_RGB.blue;

  return (
    <div className={`h-full flex flex-col gap-4 relative overflow-hidden p-4 ${isRich ? 'text-gray-900' : 'text-white'}`}>
      {/* BACKGROUND ANIMATION */}
      {!isRich && (
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
        <Prism
          animationType="rotate"
          timeScale={0.5}
          height={5.7}
          baseWidth={5.5}
          scale={5}
          hueShift={0}
          accentColor={accentRGB}
          colorFrequency={0.85}
          noise={0}
          glow={1.2}
        />
      </div>
      )}

      {/* --- HEADER --- */}
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 relative z-10 w-full mb-2">
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar pb-1">
          {/* New Project Button */}
          <button
            onClick={handleNewProject}
            className={`p-2 md:p-3 rounded-xl md:rounded-2xl transition-all text-primary shrink-0 ${isRich ? 'bg-gray-100 hover:bg-gray-200 border border-black/[0.06]' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}
            title="New Project"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Library Button */}
          <button
            onClick={() => setShowProjects(!showProjects)}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 rounded-xl md:rounded-2xl transition-all font-black uppercase text-[10px] md:text-xs tracking-widest text-primary shrink-0 ${isRich ? 'bg-gray-100 hover:bg-gray-200 border border-black/[0.06]' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}
          >
            <FolderOpen className="w-4 h-4" />
            Library
          </button>

          {/* Project Info */}
          <div className="flex flex-col min-w-[100px] md:min-w-[120px]">
            <input
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              className="bg-transparent text-sm md:text-lg font-black focus:outline-none w-full"
            />
            <div className={`flex items-center gap-2 text-[8px] md:text-[10px] uppercase font-bold ${isRich ? 'text-gray-400' : 'text-white/40'}`}>
              <span className="truncate">{TEMPLATES[activeTemplate].name}</span>
              {currentProjectId && <span className="text-green-500 flex items-center gap-1 shrink-0"><Sparkles className="w-3 h-3" /> Synced</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar pb-1">
          {/* Run Button */}
          <button
            onClick={() => {
              handleRun();
              if (user) trackAction(user.id, 'ACTION', 'Ran code in playground', { template: activeTemplate });
            }}
            className="flex items-center gap-2 px-4 md:px-6 py-2 bg-green-500 hover:bg-green-600 text-black rounded-lg md:rounded-xl font-black uppercase text-[10px] md:text-xs tracking-widest shadow-lg shadow-green-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            Run
          </button>

          {/* Template Switcher */}
          {isRich ? (
            <div className="flex gap-1 p-1 rounded-full bg-gray-100 border border-black/[0.06] shrink-0">
              {(Object.keys(TEMPLATES) as TemplateType[]).map(t => (
                <button
                  key={t}
                  onClick={() => {
                    handleTemplateSwitch(t);
                    if (user) trackAction(user.id, 'CLICK', `Switched template to ${t}`);
                  }}
                  className={`relative flex-shrink-0 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTemplate === t ? 'bg-emerald-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`}
                >
                  <span className="relative z-10">{TEMPLATES[t].name}</span>
                </button>
              ))}
            </div>
          ) : (
          <GlassSurface
            borderRadius={50}
            borderWidth={0.5}
            opacity={0.4}
            blur={10}
            className="p-1 shrink-0"
          >
            <div className="flex gap-1">
              {(Object.keys(TEMPLATES) as TemplateType[]).map(t => (
                <button
                  key={t}
                  onClick={() => {
                    handleTemplateSwitch(t);
                    if (user) trackAction(user.id, 'CLICK', `Switched template to ${t}`);
                  }}
                  className={`relative flex-shrink-0 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTemplate === t ? 'text-white' : 'text-white/40 hover:text-white'}`}
                >
                  {activeTemplate === t && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 bg-white/20 backdrop-blur-2xl rounded-full border border-white/40 shadow-[inset_0_0_12px_rgba(255,255,255,0.3)] z-0"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{TEMPLATES[t].name}</span>
                </button>
              ))}
            </div>
          </GlassSurface>
          )}

          {/* Save Button */}
          {user && (
            <button
              onClick={() => {
                handleSaveProject();
                if (user) trackAction(user.id, 'ACTION', 'Saved project in playground');
              }}
              className="p-2 rounded-xl bg-primary/20 hover:bg-primary/40 text-primary border border-primary/50 transition-all flex-shrink-0"
            >
              <Save className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 relative z-10">
        {/* Project Library Modal with Glass */}
        <AnimatePresence>
          {
            showProjects && (
              <motion.div
                initial={{ opacity: 0, x: -50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -50, scale: 0.95 }}
                className="absolute left-4 top-4 bottom-4 w-80 z-50 shadow-2xl overflow-hidden rounded-[30px]"
              >
                {isRich ? (
                  <div className="w-full h-full p-4 overflow-y-auto bg-white border border-black/[0.06] rounded-[30px] shadow-2xl">
                    <h3 className="font-bold mb-4 uppercase text-xs tracking-widest text-gray-400">Saved Projects</h3>
                    {savedProjects.map(p => (
                      <div key={p.id} onClick={() => handleLoadProject(p)} className="p-3 mb-2 rounded-xl cursor-pointer transition-all group bg-gray-100 hover:bg-gray-200 border border-black/[0.06] hover:border-primary/50">
                        <div className="font-bold text-sm group-hover:text-primary transition-colors">{p.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase mt-1">{p.type} • {new Date(p.updatedAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <GlassSurface width="100%" height="100%" borderRadius={30} borderWidth={0} opacity={0.8} blur={20} backgroundOpacity={0.6}>
                    <div className="w-full h-full p-4 overflow-y-auto">
                      <h3 className="font-bold text-white/50 mb-4 uppercase text-xs tracking-widest">Saved Projects</h3>
                      {savedProjects.map(p => (
                        <div key={p.id} onClick={() => handleLoadProject(p)} className="p-3 mb-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer border border-white/5 hover:border-primary/50 transition-all group">
                          <div className="font-bold text-sm group-hover:text-primary transition-colors">{p.name}</div>
                          <div className="text-[10px] text-white/30 uppercase mt-1">{p.type} • {new Date(p.updatedAt).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  </GlassSurface>
                )}
              </motion.div>
            )
          }
        </AnimatePresence >

        {/* EDITOR PANEL with Glass effect */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-1 mb-2">
            {Object.keys(files).map(f => (
              <button
                key={f}
                onClick={() => setActiveFile(f)}
                className={`px-3 py-1 rounded-t-lg text-xs font-mono border-t border-x relative z-10 ${activeFile === f
                  ? (isRich ? 'bg-gray-200 border-gray-300 text-gray-900' : 'bg-white/10 border-white/20 text-white')
                  : (isRich ? 'bg-transparent border-transparent text-gray-400 hover:text-gray-700' : 'bg-transparent border-transparent text-white/40 hover:text-white/60')
                  }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            {isRich ? (
              <div className="w-full h-full rounded-xl bg-white border border-black/[0.06] overflow-hidden">
                <MonacoEditor
                  language={activeTemplate === 'react' ? 'javascript' : activeTemplate === 'node' ? 'javascript' : activeTemplate}
                  value={files[activeFile]}
                  onChange={handleEditorChange}
                  transparent={false}
                />
              </div>
            ) : (
            <GlassSurface
              width="100%"
              height="100%"
              borderRadius={20}
              opacity={0.25}
              blur={25}
              backgroundOpacity={0.1}
              className="overflow-hidden"
            >
              <MonacoEditor
                language={activeTemplate === 'react' ? 'javascript' : activeTemplate === 'node' ? 'javascript' : activeTemplate}
                value={files[activeFile]}
                onChange={handleEditorChange}
                transparent={true}
              />
            </GlassSurface>
            )}
          </div>
        </div>

        {/* PREVIEW PANEL */}
        <div className={`flex-1 flex flex-col min-w-0 rounded-xl overflow-hidden ${isRich ? 'bg-white border border-black/[0.06]' : 'bg-[#000] border border-white/10'}`}>
          {/* Use a Key to force remount on Run if needed, or just let iframe handle it */}
          <div className="flex-1 relative bg-white">
            <CodeRunner
              language={activeTemplate}
              files={files}
              activeFile={activeFile}
              triggerRun={triggerRun}
              onConsole={log => setLogs(p => [...p, log])}
              onError={err => setError(err)}
            />
            {/* Overlay for non-visual templates if needed? No, let them render to body */}
          </div>

          {/* CONSOLE */}
          <div className={`h-40 border-t p-2 font-mono text-xs overflow-y-auto ${isRich ? 'bg-gray-50 border-black/[0.06]' : 'bg-[#111] border-white/10'}`}>
            <div className={`flex justify-between items-center mb-1 uppercase font-bold tracking-widest ${isRich ? 'text-gray-400' : 'text-white/30'}`}>
              <span>Console</span>
              <button onClick={() => setLogs([])}><Trash2 className={`w-3 h-3 ${isRich ? 'hover:text-gray-900' : 'hover:text-white'}`} /></button>
            </div>
            {error && <div className="text-red-500 mb-1">Error: {error}</div>}
            {logs.map((l, i) => (
              <div key={i} className={`border-b py-0.5 ${isRich ? 'text-green-600 border-black/[0.06]' : 'text-green-400 border-white/5'}`}>{l}</div>
            ))}
            {logs.length === 0 && !error && <div className={`${isRich ? 'text-gray-300' : 'text-white/20'} italic`}>Ready usually...</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaygroundPage;
