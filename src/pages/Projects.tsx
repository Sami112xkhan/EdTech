
import React, { useState } from "react";
import { projects as initialProjects } from "../data/projects";
import { Github, ExternalLink, CheckCircle2, Circle } from "lucide-react";

const Projects: React.FC = () => {
    // In a real app, this state would stream from context or API
    const [projects, setProjects] = useState(initialProjects);

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
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white leading-none mb-2">
                    PROJECT <span className="text-primary italic">VAULT</span>
                </h1>
                <p className="text-sm text-muted-foreground font-medium opacity-80">Ship these to validate your architectural prowess.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {projects.map((project) => (
                    <div key={project.id} className="bg-white/5 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 flex flex-col gap-5 hover:border-primary/20 transition-all relative group overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />

                        <div className="flex justify-between items-start relative z-10">
                            <div className="flex-1">
                                <h3 className="text-xl md:text-2xl font-black text-white leading-tight group-hover:text-primary transition-colors">{project.title}</h3>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {project.tech.map(t => (
                                        <span key={t} className="text-[10px] px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-black uppercase tracking-tighter">{t}</span>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={() => toggleStatus(project.id)}
                                className={`shrink-0 p-3 rounded-2xl transition-all ${project.status === "Completed" ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-zinc-600 hover:text-white'}`}
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
                            <button className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/10">
                                <Github className="w-4 h-4" /> Repo
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-primary/20 active:scale-95">
                                <ExternalLink className="w-4 h-4" /> Live
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Projects;
