import React from 'react';
import { motion } from 'motion/react';
import { projects } from '../data/projects';
import { ExternalLink, Github, Code, Terminal, Database, Globe } from 'lucide-react';
import GlassSurface from './GlassSurface';

const ProjectsPreview: React.FC = () => {
    return (
        <section className="py-24 relative overflow-hidden">
            <div className="container max-w-6xl mx-auto px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                        Build a Real-World Portfolio
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Don't just watch tutorials. Build production-ready applications that you can show off to employers.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {projects.map((project, index) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <GlassSurface
                                className="h-full flex flex-col p-8 group hover:bg-white/5 transition-colors"
                                borderRadius={24}
                                opacity={0.4}
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                        {getIcon(project.icon)}
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="px-3 py-1 rounded-full bg-white/5 text-xs font-medium border border-white/10 text-muted-foreground">
                                            {project.difficulty}
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-primary transition-colors">
                                    {project.title}
                                </h3>
                                <p className="text-muted-foreground mb-6 flex-grow">
                                    {project.description}
                                </p>

                                <div className="flex flex-wrap gap-2 mb-6">
                                    {project.tech.slice(0, 4).map((tech) => (
                                        <span key={tech} className="text-xs px-2 py-1 rounded-md bg-white/5 text-gray-400 border border-white/5">
                                            {tech}
                                        </span>
                                    ))}
                                    {project.tech.length > 4 && (
                                        <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-gray-400 border border-white/5">
                                            +{project.tech.length - 4}
                                        </span>
                                    )}
                                </div>
                            </GlassSurface>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const getIcon = (iconName: string) => {
    switch (iconName) {
        case 'terminal': return <Terminal className="w-6 h-6 text-indigo-400" />;
        case 'database': return <Database className="w-6 h-6 text-purple-400" />;
        case 'globe': return <Globe className="w-6 h-6 text-pink-400" />;
        default: return <Code className="w-6 h-6 text-blue-400" />;
    }
};

export default ProjectsPreview;
