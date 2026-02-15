
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
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Project Portfolio</h1>
                <p className="text-muted-foreground">Build these to prove your skills.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {projects.map((project) => (
                    <div key={project.id} className="bg-secondary/30 backdrop-blur-md border border-white/5 rounded-xl p-6 flex flex-col gap-4 hover:border-white/10 transition-colors relative group">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold">{project.title}</h3>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {project.tech.map(t => (
                                        <span key={t} className="text-xs px-2 py-1 rounded bg-white/5 text-muted-foreground border border-white/5">{t}</span>
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => toggleStatus(project.id)} className="text-muted-foreground hover:text-primary transition-colors">
                                {project.status === "Completed" ? (
                                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                                ) : (
                                    <Circle className="w-6 h-6" />
                                )}
                            </button>
                        </div>

                        <p className="text-sm text-muted-foreground flex-1">{project.description}</p>

                        <div className="flex gap-3 mt-auto">
                            <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors border border-white/5">
                                <Github className="w-4 h-4" /> Repo
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors border border-white/5">
                                <ExternalLink className="w-4 h-4" /> Live Demo
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Projects;
