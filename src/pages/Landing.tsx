import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Curriculum from '../components/Curriculum';
import LaserFlow from "../components/LaserFlow";
import { motion } from "motion/react";

const Landing: React.FC = () => {
    return (
        <div className="min-h-screen bg-background relative">
            <div className="fixed inset-0 w-full h-full z-0 bg-black pointer-events-none">
                <LaserFlow
                    flowSpeed={0.5}
                    wispSpeed={20}
                    color="#8b5cf6"
                    fogIntensity={0.6}
                />
            </div>
            <div className="relative z-10">
                <Navbar />
                <Hero />
                <Curriculum />

                <motion.footer
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="py-12 border-t border-white/5 text-center text-muted-foreground text-sm"
                >
                    <p>&copy; {new Date().getFullYear()} DevMastery. All rights reserved.</p>
                </motion.footer>
            </div>
        </div>
    );
};

export default Landing;
