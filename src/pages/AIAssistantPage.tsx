import React from "react";
import AIAssistant from "../components/AIAssistant";

const AIAssistantPage: React.FC = () => {
    return (
        <div className="h-[calc(100vh-6rem)] w-full">
            <h1 className="text-2xl font-bold mb-4">AI Mentor</h1>
            <p className="text-muted-foreground mb-6">Your personal guide to mastering Full Stack Development.</p>

            <div className="h-[calc(100%-80px)]">
                <AIAssistant variant="full" />
            </div>
        </div>
    );
};

export default AIAssistantPage;
