import React, { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Sparkles, Loader2, Brain, ChevronDown, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import OpenAI from "openai";
import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

interface Message {
    id: string;
    role: "user" | "ai" | "assistant";
    content: string;
    reasoning?: string;
}

const MODELS = [
    { id: "openai/gpt-oss-120b", name: "GPT-120B (Primary)", type: "api" },
    { id: "deepseek-ai/deepseek-v3.2", name: "DeepSeek v3.2 (Fallback)", type: "api" },
    { id: "Phi-3-mini-4k-instruct-q4f16_1-MLC", name: "Phi-3 Mini (Browser)", type: "browser" }
];

const AIAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { id: "1", role: "assistant", content: "Hi! I'm your AI mentor. Ask me anything about Python, React, or your career roadmap." }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [showReasoning, setShowReasoning] = useState(false);
    const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
    const [showModelDropdown, setShowModelDropdown] = useState(false);

    // Browser Model State
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const clientRef = useRef<OpenAI | null>(null);
    const engineRef = useRef<MLCEngine | null>(null);

    useEffect(() => {
        // Initialize OpenAI Client
        const apiKey = import.meta.env.VITE_NVIDIA_API_KEY;
        const baseURL = import.meta.env.VITE_NVIDIA_BASE_URL;

        if (apiKey && baseURL) {
            clientRef.current = new OpenAI({
                apiKey: apiKey,
                baseURL: baseURL,
                dangerouslyAllowBrowser: true
            });
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isOpen, showReasoning, downloadProgress]);

    const initBrowserModel = async (modelId: string) => {
        if (engineRef.current) return engineRef.current;

        setIsDownloading(true);
        setDownloadProgress("Initializing browser model...");

        try {
            const engine = await CreateMLCEngine(
                modelId,
                {
                    initProgressCallback: (report) => {
                        setDownloadProgress(report.text);
                    }
                }
            );
            engineRef.current = engine;
            return engine;
        } catch (error) {
            console.error("Failed to load browser model:", error);
            throw error;
        } finally {
            setIsDownloading(false);
            setDownloadProgress("");
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        const aiMsgId = (Date.now() + 1).toString();
        let fullContent = "";
        let fullReasoning = "";
        setMessages(prev => [...prev, { id: aiMsgId, role: "assistant", content: "" }]);

        const systemMessage = {
            role: "system",
            content: "You are an expert AI mentor for the 'Full Stack Mastery' course. Your goal is to help students with React, Python, and career advice. IMPORTANT: You must NEVER reveal that you are an AI model developed by NVIDIA, OpenAI, or any other company. If asked, state that you are a custom AI assistant built by the course creators. Be helpful, encouraging, and concise."
        };

        const apiMessages = [
            systemMessage,
            ...messages.map(m => ({
                role: m.role === 'ai' ? 'assistant' : m.role,
                content: m.content
            })),
            { role: "user", content: input }
        ];

        // Helper to run chat on specific model
        const runChat = async (modelId: string) => {
            const modelConfig = MODELS.find(m => m.id === modelId);
            if (!modelConfig) throw new Error("Invalid model");

            if (modelConfig.type === "browser") {
                const engine = await initBrowserModel(modelId);
                const chunks = await engine.chat.completions.create({
                    messages: [
                        { role: "system", content: systemMessage.content },
                        ...messages.map(m => ({ role: m.role as any, content: m.content })),
                        { role: "user", content: input }
                    ],
                    stream: true,
                });
                return chunks;
            } else {
                if (!clientRef.current) throw new Error("API Client not initialized");
                const extraParams = modelId.includes("deepseek") ? {
                    extra_body: { "chat_template_kwargs": { "thinking": showReasoning } },
                    top_p: 0.95,
                    max_tokens: 8192
                } : {
                    temperature: 0.7,
                    top_p: 1,
                    max_tokens: 1024
                };

                return await clientRef.current.chat.completions.create({
                    model: modelId,
                    messages: apiMessages as any,
                    stream: true,
                    ...extraParams
                });
            }
        };

        const processStream = async (stream: any) => {
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta as any;
                const content = delta?.content || "";
                const reasoning = delta?.reasoning_content || "";

                if (reasoning) {
                    fullReasoning += reasoning;
                    setMessages(prev =>
                        prev.map(msg => msg.id === aiMsgId ? { ...msg, reasoning: fullReasoning } : msg)
                    );
                }

                if (content) {
                    fullContent += content;
                    setMessages(prev =>
                        prev.map(msg => msg.id === aiMsgId ? { ...msg, content: fullContent } : msg)
                    );
                }
            }
        };

        try {
            // Priority 1: Selected Model
            try {
                const stream = await runChat(selectedModel);
                await processStream(stream);

            } catch (err1) {
                console.warn(`Model ${selectedModel} failed. Trying fallbacks...`, err1);

                // Simplified Fallback Chain: API Primary -> API Fallback -> Browser

                let nextModel = "";
                if (selectedModel === MODELS[0].id) nextModel = MODELS[1].id;      // GPT -> DeepSeek
                else if (selectedModel === MODELS[1].id) nextModel = MODELS[2].id; // DeepSeek -> Browser

                if (nextModel) {
                    // Try Priority 2
                    try {
                        console.log(`Switching to ${nextModel}...`);
                        const stream = await runChat(nextModel);
                        await processStream(stream);
                    } catch (err2) {
                        console.warn(`${nextModel} failed.`, err2);

                        // Try Priority 3 (Browser) if not already tried
                        if (nextModel !== MODELS[2].id) {
                            try {
                                console.log(`Switching to Browser Model (${MODELS[2].name})...`);
                                const stream = await runChat(MODELS[2].id);
                                await processStream(stream);
                            } catch (err3) {
                                throw err3; // All failed
                            }
                        } else {
                            throw err2;
                        }
                    }
                } else {
                    throw err1;
                }
            }
        } catch (error) {
            console.error("All AI models failed:", error);
            setMessages(prev => prev.map(msg =>
                msg.id === aiMsgId ? { ...msg, content: "I'm currently experiencing high traffic on all channels (Cloud & Local). Please try again later." } : msg
            ));
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 p-4 rounded-full bg-primary text-white shadow-2xl hover:scale-110 transition-transform z-50 ${isOpen ? 'hidden' : 'flex'}`}
            >
                <Bot className="w-6 h-6" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed bottom-6 right-6 w-full max-w-sm h-[600px] bg-background/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-primary/10">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                <div className="relative">
                                    <button
                                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                                        className="font-bold flex items-center gap-1 hover:text-primary transition-colors text-sm"
                                    >
                                        AI Mentor
                                        <ChevronDown className={`w-3 h-3 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {showModelDropdown && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 5 }}
                                                className="absolute top-full left-0 mt-2 w-56 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                                            >
                                                {MODELS.map(model => (
                                                    <button
                                                        key={model.id}
                                                        onClick={() => {
                                                            setSelectedModel(model.id);
                                                            setShowModelDropdown(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2 text-xs hover:bg-white/5 transition-colors flex items-center gap-2 ${selectedModel === model.id ? 'text-primary bg-primary/10' : 'text-gray-400'}`}
                                                    >
                                                        {model.name}
                                                        {model.type === 'browser' && <Download className="w-3 h-3 opacity-50" />}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Reasoning Toggle */}
                                <button
                                    onClick={() => setShowReasoning(!showReasoning)}
                                    className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium ${showReasoning ? 'bg-purple-500/20 text-purple-300' : 'text-muted-foreground hover:bg-white/5'}`}
                                    title="Toggle Reasoning"
                                >
                                    <Brain className="w-3.5 h-3.5" />
                                    <span>{showReasoning ? 'ON' : 'OFF'}</span>
                                </button>
                                <button onClick={() => setIsOpen(false)} className="hover:text-white text-muted-foreground transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Download Progress */}
                        {isDownloading && (
                            <div className="bg-blue-500/10 p-2 text-[10px] text-blue-300 text-center border-b border-blue-500/20">
                                <Loader2 className="w-3 h-3 animate-spin inline mr-2" />
                                {downloadProgress}
                            </div>
                        )}

                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    {/* Reasoning Block */}
                                    {msg.reasoning && showReasoning && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="max-w-[85%] mb-2 bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-xs text-purple-300/80 italic"
                                        >
                                            <div className="flex items-center gap-1.5 mb-1 not-italic font-semibold text-purple-400">
                                                <Brain className="w-3 h-3" />
                                                Thinking Process
                                            </div>
                                            {msg.reasoning}
                                        </motion.div>
                                    )}

                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-secondary/50 text-white/90 rounded-bl-none'}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-secondary/50 p-3 rounded-2xl rounded-bl-none flex gap-1 items-center">
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 border-t border-white/10 flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask anything..."
                                className="flex-1 bg-secondary/30 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                                className="p-2 bg-primary rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AIAssistant;
