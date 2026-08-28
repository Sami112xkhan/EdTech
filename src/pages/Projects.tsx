import React, { useState, useEffect } from "react";
import { Github, ExternalLink, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Link } from "react-router-dom";

interface Project {
    id: string;
    name: string;
    type: string;
    updatedAt: string;
    // Mocked fields for UI compatibility
    description: string;
    status: "Completed" | "Pending";
    tech: string[];
}

const Projects: React.FC = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isRich = theme === 'rich';
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            if (!user?.email) return;
            try {
                const response = await fetch(`/api/playground/list?email=${encodeURIComponent(user.email)}`);
                if (response.ok) {
                    const data = await response.json();
                    setProjects(data.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        type: p.type,
                        updatedAt: p.updatedAt,
                        description: "A creative coding experiment built in the Playground.",
                        status: "Pending", // Default
                        tech: [p.type === 'react' ? 'React' : p.type === 'node' ? 'Node.js' : 'Python']
                    })));
                }
            } catch (error) {
                console.error("Failed to load projects", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchProjects();
    }, [user]);

    const toggleStatus = (id: string) => {
        setProjects(prev => prev.map(p => {
            if (p.id === id) {
                return {
                    ...p,
                    status: p.status === "Completed" ? "Pending" : "Completed"
                };
            }
            return p;
        }));
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="px-2 md:px-0">
                <h1 className={`text-3xl md:text-5xl font-black tracking-tighter leading-none mb-2 ${isRich ? 'text-gray-900' : 'text-white'}`}>
                    PROJECT <span className="text-primary italic">VAULT</span>
                </h1>
                <p className="text-sm text-muted-foreground font-medium opacity-80">Ship these to validate your architectural prowess.</p>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading your masterpiece...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {projects.length === 0 ? (
                        <div className="col-span-full text-center py-20 opacity-50">
                            <p>No projects found. Go build something!</p>
                            <Link to="/playground" className="text-primary hover:underline mt-2 inline-block">Go to Playground</Link>
                        </div>
                    ) : (
                        projects.map((project) => (
                            <div key={project.id} className={`${isRich ? 'bg-white border border-black/[0.06]' : 'bg-white/5 backdrop-blur-xl border border-white/5 shadow-2xl'} rounded-[2rem] p-6 flex flex-col gap-5 hover:border-primary/20 transition-all relative group overflow-hidden`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />

                                <div className="flex justify-between items-start relative z-10">
                                    <div className="flex-1">
                                        <h3 className={`text-xl md:text-2xl font-black leading-tight group-hover:text-primary transition-colors ${isRich ? 'text-gray-900' : 'text-white'}`}>{project.name}</h3>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {project.tech.map(t => (
                                                <span key={t} className="text-[10px] px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-black uppercase tracking-tighter">{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleStatus(project.id)}
                                        className={`shrink-0 p-3 rounded-2xl transition-all ${project.status === "Completed" ? 'bg-green-500/10 text-green-400' : isRich ? 'bg-gray-100 text-gray-400 hover:text-gray-900' : 'bg-white/5 text-zinc-600 hover:text-white'}`}
                                    >
                                        {project.status === "Completed" ? (
                                            <CheckCircle2 className="w-6 h-6" />
                                        ) : (
                                            <Circle className="w-6 h-6" />
                                        )}
                                    </button>
                                </div>

                                <p className="text-sm text-muted-foreground font-medium flex-1 leading-relaxed opacity-80 italic relative z-10">
                                    {project.description}
                                </p>

                                <div className="flex gap-3 mt-auto relative z-10">
                                    <button className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all opacity-50 cursor-not-allowed ${isRich ? 'bg-gray-100 hover:bg-gray-200 text-gray-400 border border-black/[0.06]' : 'bg-white/5 hover:bg-white/10 text-white/50 border border-white/10'}`}>
                                        <Github className="w-4 h-4" /> Repo
                                    </button>
                                    <Link to={`/playground?project=${project.id}`} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-primary/20 active:scale-95 hover:bg-primary/90">
                                        <ExternalLink className="w-4 h-4" /> Open
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default Projects;
