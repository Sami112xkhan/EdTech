import React from "react";
import AIAssistant from "../components/AIAssistant";

const AIAssistantPage: React.FC = () => {
    return (
        <div className="h-[calc(100dvh-6rem)] w-full flex flex-col">
            <h1 className="text-2xl font-bold mb-2 shrink-0">AI Mentor</h1>
            <p className="text-muted-foreground mb-4 shrink-0">Your personal guide to mastering Full Stack Development.</p>

            <div className="flex-1 min-h-0">
                <AIAssistant variant="full" />
            </div>
        </div>
    );
};

export default AIAssistantPage;
