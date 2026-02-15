
import React, { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Sparkles, Loader2, Brain } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import OpenAI from "openai";

interface Message {
    id: string;
    role: "user" | "ai" | "assistant"; // OpenAI uses 'assistant'
    content: string;
    reasoning?: string;
}

const AIAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { id: "1", role: "assistant", content: "Hi! I'm your AI mentor. Ask me anything about Python, React, or your career roadmap." }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [showReasoning, setShowReasoning] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const clientRef = useRef<OpenAI | null>(null);

    useEffect(() => {
        // Initialize OpenAI Client
        const apiKey = import.meta.env.VITE_NVIDIA_API_KEY;
        const baseURL = import.meta.env.VITE_NVIDIA_BASE_URL;

        if (apiKey && baseURL) {
            clientRef.current = new OpenAI({
                apiKey: apiKey,
                baseURL: baseURL,
                dangerouslyAllowBrowser: true // Required for client-side usage
            });
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || !clientRef.current) return;

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

        const performChat = async (model: string, extraParams: any = {}) => {
            if (!clientRef.current) throw new Error("Client not initialized");

            return await clientRef.current.chat.completions.create({
                model: model,
                messages: apiMessages as any,
                temperature: 0.7,
                top_p: 1,
                max_tokens: 1024,
                stream: true,
                ...extraParams
            });
        };

        try {
            // Try Primary Model
            try {
                const stream = await performChat("openai/gpt-oss-120b") as any;

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
            } catch (primaryError) {
                console.warn("Primary model failed, switching to Fallback (DeepSeek)...", primaryError);

                // Try Fallback Model
                const stream = await performChat("deepseek-ai/deepseek-v3.2", {
                    extra_body: { "chat_template_kwargs": { "thinking": showReasoning } },
                    top_p: 0.95,
                    max_tokens: 8192
                }) as any;

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
            }
        } catch (error) {
            console.error("All AI models failed:", error);
            setMessages(prev => prev.map(msg =>
                msg.id === aiMsgId ? { ...msg, content: "I'm currently experiencing high traffic. Please try again later." } : msg
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
                        className="fixed bottom-6 right-6 w-full max-w-sm h-[500px] bg-background/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-primary/10">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                <span className="font-bold">AI Mentor (NVIDIA Powered)</span>
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
