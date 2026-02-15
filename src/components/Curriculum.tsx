
import React from "react";
import { motion } from "motion/react";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, PlayCircle, Lock } from "lucide-react";
import { curriculum } from "../data/curriculum";

const Curriculum: React.FC = () => {
    return (
        <section id="curriculum" className="py-24 relative">
            <div className="container max-w-4xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Master the Modern Stack</h2>
                    <p className="text-muted-foreground">From 'Hello World' to deployed SaaS application.</p>
                </div>

                <Accordion.Root type="multiple" className="space-y-4">
                    {curriculum.map((phase, index) => (
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
