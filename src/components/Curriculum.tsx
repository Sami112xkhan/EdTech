
import React, { useState } from "react";
import { motion } from "motion/react";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, PlayCircle, Lock, BookOpen, Shield } from "lucide-react";
import { curriculum } from "../data/curriculum";
import { cybersecurityCurriculum } from "../data/cybersecurityCurriculum";
import type { Module } from "../data/curriculum";
import GlassSurface from "./GlassSurface";
import { useActiveCourse } from "../hooks/useActiveCourse";

const Curriculum: React.FC = () => {
    const [activeCourse, setActiveCourse] = useActiveCourse();
    const activeCurriculum: Module[] = activeCourse === 'cyber' ? cybersecurityCurriculum : curriculum;

    return (
        <section id="curriculum" className="py-24 relative">
            <div className="container max-w-4xl mx-auto px-6">
                <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        {activeCourse === 'cyber' ? 'Master Cybersecurity in 90 Days' : 'Master the Modern Stack'}
                    </h2>
                    <p className="text-muted-foreground">
                        {activeCourse === 'cyber'
                            ? 'From networking fundamentals to ethical hacking — your complete cybersecurity journey.'
                            : "From 'Hello World' to deployed SaaS application."}
                    </p>
                </div>

                {/* Course Selector */}
                <div className="flex justify-center mb-10 w-full relative z-10">
                    <GlassSurface
                        borderRadius={50}
                        borderWidth={0.5}
                        opacity={0.4}
                        blur={10}
                        className="p-1 w-full md:w-auto"
                    >
                        <div className="flex w-full md:w-auto">
                            <button
                                onClick={() => setActiveCourse('fullstack')}
                                className={`relative flex-1 md:flex-none px-3 md:px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all text-center ${activeCourse === 'fullstack' ? 'text-white' : 'text-white/40 hover:text-white'}`}
                            >
                                {/* Floating Background Pill - High Fidelity Glass */}
                                {activeCourse === 'fullstack' && (
                                    <motion.div
                                        layoutId="home-curriculum-active-pill"
                                        drag="x"
                                        dragConstraints={{ left: 0, right: 0 }}
                                        dragElastic={1}
                                        onDragEnd={(_, info) => {
                                            const threshold = 40;
                                            const velocityThreshold = 500;
                                            if ((info.offset.x > threshold || info.velocity.x > velocityThreshold)) {
                                                setActiveCourse('cyber');
                                            }
                                        }}
                                        whileDrag={{
                                            opacity: 0.9,
                                            scale: 1.1,
                                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                                            backdropFilter: "blur(0px)",
                                            boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
                                        }}
                                        whileTap={{ scale: 1.05 }}
                                        className="absolute inset-0 bg-white/20 backdrop-blur-2xl rounded-full border border-white/40 shadow-[inset_0_0_12px_rgba(255,255,255,0.3),0_8_32_rgba(0,0,0,0.3)] cursor-grab active:cursor-grabbing z-0"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center justify-center gap-2 pointer-events-none">
                                    <BookOpen className="w-4 h-4" />
                                    Full Stack Web Dev
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveCourse('cyber')}
                                className={`relative flex-1 md:flex-none px-3 md:px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all text-center ${activeCourse === 'cyber' ? 'text-white' : 'text-white/40 hover:text-white'}`}
                            >
                                {/* Floating Background Pill - High Fidelity Glass */}
                                {activeCourse === 'cyber' && (
                                    <motion.div
                                        layoutId="home-curriculum-active-pill"
                                        drag="x"
                                        dragConstraints={{ left: 0, right: 0 }}
                                        dragElastic={1}
                                        onDragEnd={(_, info) => {
                                            const threshold = 40;
                                            const velocityThreshold = 500;
                                            if ((info.offset.x < -threshold || info.velocity.x < -velocityThreshold)) {
                                                setActiveCourse('fullstack');
                                            }
                                        }}
                                        whileDrag={{
                                            opacity: 0.9,
                                            scale: 1.1,
                                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                                            backdropFilter: "blur(0px)",
                                            boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
                                        }}
                                        whileTap={{ scale: 1.05 }}
                                        className="absolute inset-0 bg-white/20 backdrop-blur-2xl rounded-full border border-white/40 shadow-[inset_0_0_12px_rgba(255,255,255,0.3),0_8_32_rgba(0,0,0,0.3)] cursor-grab active:cursor-grabbing z-0"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center justify-center gap-2 pointer-events-none">
                                    <Shield className="w-4 h-4" />
                                    90 Days CyberSec
                                </span>
                            </button>
                        </div>
                    </GlassSurface>
                </div>

                <Accordion.Root type="multiple" className="space-y-4">
                    {activeCurriculum.map((phase, index) => (
                        <motion.div
                            key={phase.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <Accordion.Item
                                value={phase.id}
                                className="group bg-secondary/30 border border-white/5 rounded-2xl overflow-hidden glass-hover data-[state=open]:border-primary/30"
                            >
                                <Accordion.Header>
                                    <Accordion.Trigger className="w-full flex items-center justify-between p-6 text-left transition-all cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground group-data-[state=open]:bg-primary group-data-[state=open]:text-white transition-colors">
                                                {index}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg">{phase.title}</h3>
                                                <p className="text-sm text-muted-foreground">{phase.lessons.length} Lessons</p>
                                            </div>
                                        </div>
                                        <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
                                    </Accordion.Trigger>
                                </Accordion.Header>

                                <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                                    <div className="px-6 pb-6 pt-2 space-y-2">
                                        {phase.lessons.map((lesson) => (
                                            <div key={lesson.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group/lesson cursor-default">
                                                <div className="flex items-center gap-3">
                                                    {lesson.free ? (
                                                        <PlayCircle className="w-4 h-4 text-green-400" />
                                                    ) : (
                                                        <Lock className="w-4 h-4 text-muted-foreground group-hover/lesson:text-primary transition-colors" />
                                                    )}
                                                    <span className={`text-sm ${lesson.free ? 'text-white' : 'text-muted-foreground'}`}>
                                                        {lesson.title}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                                            </div>
                                        ))}
                                    </div>
                                </Accordion.Content>
                            </Accordion.Item>
                        </motion.div>
                    ))}
                </Accordion.Root>
            </div>
        </section>
    );
};

export default Curriculum;
