import React from "react";
import { motion } from "motion/react";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, PlayCircle, Lock } from "lucide-react";
import { curriculum } from "../data/curriculum";
import { cybersecurityCurriculum } from "../data/cybersecurityCurriculum";
import { dataScienceCurriculum } from "../data/dataScienceCurriculum";
import type { Module } from "../data/curriculum";
import { useActiveCourse } from "../hooks/useActiveCourse";

const courses = [
    { id: "fullstack" as const, label: "Full Stack Web Dev" },
    { id: "cyber" as const, label: "Cyber Security" },
    { id: "datascience" as const, label: "Data Science" },
] as const;

const Curriculum: React.FC = () => {
    const [activeCourse, setActiveCourse] = useActiveCourse();
    const activeCurriculum: Module[] =
        activeCourse === "cyber"
            ? cybersecurityCurriculum
            : activeCourse === "datascience"
            ? dataScienceCurriculum
            : curriculum;

    const activeInfo =
        activeCourse === "cyber"
            ? { title: "Master Cybersecurity in 90 Days", subtitle: "From networking fundamentals to ethical hacking — your complete cybersecurity journey." }
            : activeCourse === "datascience"
            ? { title: "Data Science for Beginners", subtitle: "Learn the concepts behind data science, visualization, and real-world deployment." }
            : { title: "Master the Modern Stack", subtitle: "From 'Hello World' to deployed SaaS application." };

    return (
        <section id="curriculum">
            <div className="bg-[#1d1d1f] py-24 md:py-32">
                <div className="max-w-[980px] mx-auto px-6">
                    {/* Section header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-14"
                    >
                        <h2 className="text-[clamp(32px,5vw,48px)] font-semibold leading-[1.1] tracking-[-0.02em] text-white mb-4">
                            {activeInfo.title}
                        </h2>
                        <p className="text-[clamp(17px,2vw,20px)] font-light leading-[1.4] text-[#86868b] max-w-[580px] mx-auto">
                            {activeInfo.subtitle}
                        </p>
                    </motion.div>

                    {/* Course selector */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="flex justify-center mb-16"
                    >
                        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.06] border border-white/[0.08]">
                            {courses.map((course) => {
                                const isActive = activeCourse === course.id;
                                return (
                                    <button
                                        key={course.id}
                                        onClick={() => setActiveCourse(course.id)}
                                        className={`px-5 py-2.5 rounded-full text-[15px] font-medium leading-none transition-all ${
                                            isActive
                                                ? "bg-white text-black"
                                                : "text-[#86868b] hover:text-white"
                                        }`}
                                    >
                                        {course.label}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Accordion */}
                    <div className="space-y-[2px]">
                        {activeCurriculum.map((phase, index) => {
                            const tileBg = index % 2 === 0 ? "#272729" : "#2a2a2c";
                            return (
                                <motion.div
                                    key={phase.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-40px" }}
                                    transition={{ duration: 0.4, delay: index * 0.04 }}
                                >
                                    <Accordion.Item
                                        value={phase.id}
                                        className="group overflow-hidden"
                                        style={{ backgroundColor: tileBg }}
                                    >
                                        <Accordion.Header>
                                            <Accordion.Trigger className="w-full flex items-center justify-between px-6 md:px-8 py-5 md:py-6 text-left transition-colors hover:bg-white/[0.02] cursor-pointer">
                                                <div className="flex items-center gap-4 md:gap-5">
                                                    <span className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-[13px] font-medium text-[#86868b] group-data-[state=open]:bg-[#2997ff] group-data-[state=open]:text-white transition-colors">
                                                        {index + 1}
                                                    </span>
                                                    <div>
                                                        <h3 className="text-[17px] md:text-[19px] font-semibold leading-[1.2] tracking-[-0.01em] text-white">
                                                            {phase.title}
                                                        </h3>
                                                        <p className="text-[14px] md:text-[15px] font-normal leading-[1.4] text-[#86868b] mt-0.5">
                                                            {phase.lessons.length} Lessons
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronDown className="w-5 h-5 text-[#86868b] transition-transform duration-300 group-data-[state=open]:rotate-180 shrink-0" />
                                            </Accordion.Trigger>
                                        </Accordion.Header>

                                        <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                                            <div className="px-6 md:px-8 pb-6 pt-0 space-y-0">
                                                {phase.lessons.map((lesson, li) => (
                                                    <div
                                                        key={lesson.id}
                                                        className={`flex items-center justify-between py-3.5 ${
                                                            li < phase.lessons.length - 1 ? "border-b border-white/[0.04]" : ""
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {lesson.free ? (
                                                                <PlayCircle className="w-5 h-5 text-[#30d158] shrink-0" />
                                                            ) : (
                                                                <Lock className="w-4 h-4 text-[#48484a] shrink-0" />
                                                            )}
                                                            <span className={`text-[15px] md:text-[17px] font-normal leading-[1.4] ${
                                                                lesson.free ? "text-white" : "text-[#86868b]"
                                                            }`}>
                                                                {lesson.title}
                                                            </span>
                                                        </div>
                                                        <span className="text-[13px] text-[#48484a] font-normal leading-none shrink-0 ml-4">
                                                            {lesson.duration}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </Accordion.Content>
                                    </Accordion.Item>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Curriculum;
