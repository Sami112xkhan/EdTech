import React, { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Sparkles, Loader2, Brain, ChevronDown, Download, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import OpenAI from "openai";
import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import BlurText from "./BlurText";
import { useAuth } from "../context/AuthContext";
import GlassSurface from "./GlassSurface";

interface Message {
    id: string;
    role: "user" | "ai" | "assistant";
    content: string;
    reasoning?: string;
}

const MODELS = [
    { id: "openai/gpt-oss-120b", name: "GPT-120B (Primary)", type: "api" },
    { id: "deepseek-ai/deepseek-v3.2", name: "DeepSeek v3.2 (Fallback)", type: "api" },
    { id: "Phi-3-mini-4k-instruct-q4f16_1-MLC", name: "Phi-3 Mini (Desktop Browser)", type: "browser" },
    { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", name: "Llama 1B (Mobile Browser)", type: "browser" }
];

interface AIAssistantProps {
    variant?: 'floating' | 'full';
}

const AIAssistant: React.FC<AIAssistantProps> = ({ variant = 'floating' }) => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(variant === 'full');
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { id: "1", role: "assistant", content: "Hi! I'm your AI mentor. Ask me anything about Python, React, or your career roadmap." }
    ]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [showReasoning, setShowReasoning] = useState(false);
    // Auto-detect mobile usage to default to lighter ~1B models to prevent RAM crashing
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator?.userAgent || '');
    const defaultModel = isMobile ? MODELS[3].id : MODELS[2].id;

    const [selectedModel, setSelectedModel] = useState(defaultModel);
    const [showModelDropdown, setShowModelDropdown] = useState(false);

    // Browser Model State
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const clientRef = useRef<OpenAI | null>(null);
    const engineRef = useRef<MLCEngine | null>(null);

    // Ensure it stays open if full mode
    useEffect(() => {
        if (variant === 'full') setIsOpen(true);
    }, [variant]);

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

    // Load Chat History from SQL
    useEffect(() => {
        const loadHistory = async () => {
            if (!user?.email) return;
            setIsLoadingHistory(true);
            try {
                const response = await fetch(`/api/ai/chat/history?email=${encodeURIComponent(user.email)}`);
                if (response.ok) {
                    const history = await response.json();
                    if (history.length > 0) {
                        setMessages(history.map((m: any) => ({
                            id: m.id,
                            role: m.role,
                            content: m.content,
                            reasoning: m.reasoning
                        })));
                    }
                }
            } catch (error) {
                console.error("Failed to load chat history:", error);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        loadHistory();
    }, [user?.email]);

    const saveMessage = async (role: string, content: string, reasoning?: string) => {
        if (!user?.email) return;
        try {
            await fetch('/api/ai/chat/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    role,
                    content,
                    reasoning
                })
            });
        } catch (error) {
            console.error("Failed to save chat message:", error);
        }
    };

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

            if (isNearBottom) {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
        }
    };

    // Auto-scroll logic: Only scroll if user was already near the bottom
    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, showReasoning, downloadProgress]);

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

    const abortControllerRef = useRef<AbortController | null>(null);
    const isRequestInProgress = useRef(false);

    const handleClearChat = async () => {
        if (isTyping || !user?.email) return;

        try {
            const response = await fetch('/api/ai/chat/clear', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email })
            });

            if (response.ok) {
                setMessages([
                    { id: "1", role: "assistant", content: "Chat cleared. How can I help you with Python or React today?" }
                ]);
            }
        } catch (error) {
            console.error("Failed to clear chat history:", error);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isRequestInProgress.current) return;

        const aiMsgId = `ai-${Date.now()}`; // Define aiMsgId early for finally block

        try {
            isRequestInProgress.current = true;
            setIsTyping(true);

            // Cancel any stale controllers
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();
            const signal = abortControllerRef.current.signal;

            const userMsg: Message = { id: `user-${Date.now()}`, role: "user", content: input };
            setMessages(prev => [...prev, userMsg]);
            setInput("");

            // Sync User Message to DB
            saveMessage("user", input);

            let fullContent = "";
            let fullReasoning = "";
            setMessages(prev => [...prev, { id: aiMsgId, role: "assistant", content: "" }]);

            const systemMessage = {
                role: "system" as const,
                content: "You are the 'Full Stack Mastery' AI Mentor. Help students with React, Python, and career advice. " +
                    "Keep answers concise, friendly, and directly address the user's prompt. " +
                    "Do not provide long guides or roadmaps unless explicitly asked."
            };

            const apiMessages = [
                systemMessage,
                ...messages.filter(m => m.content.trim() !== "" && m.id !== "1").map(m => ({
                    role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
                    content: m.content
                })),
                { role: "user" as const, content: input }
            ];

            // Helper to run chat on specific model
            const runChat = async (modelId: string) => {
                if (signal.aborted) throw new Error("Aborted");
                const modelConfig = MODELS.find(m => m.id === modelId);
                if (!modelConfig) throw new Error("Invalid model");

                if (modelConfig.type === "browser") {
                    const engine = await initBrowserModel(modelId);
                    const chunks = await engine.chat.completions.create({
                        messages: apiMessages as any,
                        stream: true,
                        temperature: 0.7,
                        top_p: 0.9
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
                    }, { signal: signal });
                }
            };

            const processStream = async (stream: any) => {
                const iterator = stream[Symbol.asyncIterator]();

                while (true) {
                    if (signal.aborted) break;

                    const nextPromise = iterator.next();
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Stream Timeout")), 15000)
                    );

                    const result = await Promise.race([nextPromise, timeoutPromise]) as any;
                    if (result.done || signal.aborted) break;

                    const chunk = result.value;
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

            // Model Selection Logic with Fallbacks
            try {
                // Priority 1: Selected Model
                const stream = await runChat(selectedModel);
                await processStream(stream);

            } catch (err1: any) {
                if (err1.name === 'AbortError' || err1.message === 'Aborted') {
                    console.log("Generation stopped by user");
                    throw err1; // Re-throw to be caught by the outer catch, then handled by finally
                }
                console.warn(`Model ${selectedModel} failed. Trying fallbacks...`, err1);

                // Simplified Fallback Chain: API Primary -> API Fallback -> Browser

                let nextModel = "";
                if (selectedModel === MODELS[0].id) nextModel = MODELS[1].id;      // GPT -> DeepSeek
                else if (selectedModel === MODELS[1].id) nextModel = MODELS[2].id; // DeepSeek -> Browser
                else if (selectedModel === MODELS[2].id) nextModel = MODELS[0].id; // Browser -> GPT (if browser was primary)

                if (nextModel) {
                    // Try Fallback Model
                    try {
                        console.log(`Switching to ${nextModel}...`);
                        const stream = await runChat(nextModel);
                        await processStream(stream);
                    } catch (err2: any) {
                        if (err2.name === 'AbortError' || err2.message === 'Aborted') {
                            console.log("Generation stopped by user during fallback");
                            throw err2;
                        }
                        console.warn(`${nextModel} failed.`, err2);

                        // If the fallback was not the browser model, try the browser model as a last resort
                        if (nextModel !== MODELS[2].id) {
                            try {
                                console.log(`Switching to Browser Model (${MODELS[2].name})...`);
                                const stream = await runChat(MODELS[2].id);
                                await processStream(stream);
                            } catch (err3) {
                                throw err3; // All failed
                            }
                        } else {
                            throw err2; // Fallback was browser, and it failed
                        }
                    }
                } else {
                    throw err1; // No fallback path defined or initial model was the only option and failed
                }
            }
            // Sync Assistant Response to DB after successful completion (of any model in the chain)
            saveMessage("assistant", fullContent, fullReasoning);
        } catch (error: any) {
            if (error.name === 'AbortError' || error.message === 'Aborted') {
                console.log("AI generation aborted.");
                // No need to set error message, as it was aborted by user
            } else {
                console.error("All AI models failed:", error);
                setMessages(prev => prev.map(msg =>
                    msg.id === aiMsgId ? { ...msg, content: "I'm currently experiencing high traffic on all channels (Cloud & Local). Please try again later." } : msg
                ));
            }
        } finally {
            isRequestInProgress.current = false;
            setIsTyping(false);
            abortControllerRef.current = null;
            setMessages(prev => {
                const last = prev[prev.length - 1];
                // If the last message is empty (meaning generation was stopped or failed before content was added), remove it.
                if (last && last.id === aiMsgId && !last.content && !last.reasoning) {
                    return prev.slice(0, -1);
                }
                return prev;
            });
        }
    };

    const isFloating = variant === 'floating';

    return (
        <>
            {isFloating && (
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(true)}
                    className={`fixed bottom-6 right-6 z-50 ${isOpen ? 'hidden' : 'flex'} overflow-hidden rounded-full shadow-2xl`}
                >
                    <GlassSurface
                        borderRadius={50} // High value for circular
                        opacity={0.3}
                        blur={20}
                        backgroundOpacity={0.2}
                        className="p-4"
                    >
                        <Bot className="w-6 h-6 text-primary" />
                    </GlassSurface>
                </motion.button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={isFloating ? { opacity: 0, scale: 0.9, y: 20 } : { opacity: 0 }}
                        animate={isFloating ? { opacity: 1, scale: 1, y: 0 } : { opacity: 1 }}
                        exit={isFloating ? { opacity: 0, scale: 0.9, y: 20 } : { opacity: 0 }}
                        className={
                            isFloating
                                ? "fixed bottom-6 right-6 w-full max-w-sm h-[600px] bg-[#0d0d12]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col z-50 overflow-hidden"
                                : "w-full h-full bg-[#0d0d12]/40 backdrop-blur-xl border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl"
                        }
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-primary/20 via-primary/10 to-transparent backdrop-blur-md">
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
                                                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute top-full left-0 mt-2 w-64 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-white/5"
                                            >
                                                <div className="p-2 space-y-1">
                                                    {MODELS.map(model => (
                                                        <button
                                                            key={model.id}
                                                            onClick={() => {
                                                                setSelectedModel(model.id);
                                                                setShowModelDropdown(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center justify-between group ${selectedModel === model.id ? 'bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' : 'hover:bg-white/5 text-white/70 hover:text-white border border-transparent'}`}
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{model.name}</span>
                                                                <span className="text-[10px] opacity-60 mt-0.5">{model.type === 'browser' ? 'Runs locally, uses device RAM' : 'Cloud API, faster response'}</span>
                                                            </div>
                                                            {selectedModel === model.id ? (
                                                                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                                                            ) : model.type === 'browser' && (
                                                                <Download className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Clear Chat */}
                                <button
                                    onClick={handleClearChat}
                                    className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
                                    title="Clear Chat"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                {/* Reasoning Toggle */}
                                <button
                                    onClick={() => setShowReasoning(!showReasoning)}
                                    className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium ${showReasoning ? 'bg-purple-500/20 text-purple-300' : 'text-muted-foreground hover:bg-white/5'}`}
                                    title="Toggle Reasoning"
                                >
                                    <Brain className="w-3.5 h-3.5" />
                                    <span>{showReasoning ? 'ON' : 'OFF'}</span>
                                </button>
                                {isFloating && (
                                    <button onClick={() => setIsOpen(false)} className="hover:text-white text-muted-foreground transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
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
                        <div
                            ref={scrollContainerRef}
                            data-lenis-prevent
                            className="flex-1 overflow-y-auto p-4 space-y-4"
                        >
                            {messages.map((msg, idx) => {
                                const isStreaming = isTyping && idx === messages.length - 1 && msg.role === 'assistant';

                                return (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={msg.id}
                                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                    >
                                        {/* Reasoning Block */}
                                        {msg.reasoning && showReasoning && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="max-w-[85%] mb-2 bg-purple-500/5 border border-purple-500/10 rounded-2xl p-3 text-xs text-purple-300/80 italic shadow-inner"
                                            >
                                                <div className="flex items-center gap-1.5 mb-1 not-italic font-semibold text-purple-400">
                                                    <Brain className="w-3 h-3" />
                                                    Thinking Process
                                                </div>
                                                {msg.reasoning}
                                            </motion.div>
                                        )}

                                        <div className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] leading-relaxed ${msg.role === 'user'
                                            ? 'bg-gradient-to-br from-primary to-primary/80 text-white rounded-br-none shadow-lg shadow-primary/20'
                                            : 'bg-white/5 text-white/90 rounded-bl-none border border-white/10 shadow-sm'
                                            }`}>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    code({ node, inline, className, children, ...props }: any) {
                                                        const match = /language-(\w+)/.exec(className || '');
                                                        return !inline && match ? (
                                                            <div className="relative group rounded-lg overflow-hidden my-2">
                                                                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => navigator.clipboard.writeText(String(children))}
                                                                        className="p-1 bg-white/10 hover:bg-white/20 rounded text-xs text-white/70 hover:text-white transition-colors"
                                                                    >
                                                                        Copy
                                                                    </button>
                                                                </div>
                                                                <SyntaxHighlighter
                                                                    style={vscDarkPlus}
                                                                    language={match[1]}
                                                                    PreTag="div"
                                                                    customStyle={{ margin: 0, borderRadius: '0.5rem', fontSize: '0.8rem' }}
                                                                    {...props}
                                                                >
                                                                    {String(children).replace(/\n$/, '')}
                                                                </SyntaxHighlighter>
                                                            </div>
                                                        ) : (
                                                            <code className={`${className} bg-black/20 px-1 py-0.5 rounded text-xs font-mono`} {...props}>
                                                                {children}
                                                            </code>
                                                        );
                                                    },
                                                    p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                                                    ul: ({ children }: any) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                                                    ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                                                    li: ({ children }: any) => <li className="mb-1">{children}</li>,
                                                    h1: ({ children }: any) => <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h1>,
                                                    h2: ({ children }: any) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                                                    h3: ({ children }: any) => <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
                                                    blockquote: ({ children }: any) => <blockquote className="border-l-2 border-primary/50 pl-3 py-1 my-2 bg-primary/5 italic">{children}</blockquote>,
                                                    a: ({ children, href }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{children}</a>,
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    </motion.div>
                                );
                            })}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-secondary/30 backdrop-blur-md p-4 rounded-2xl rounded-bl-none flex gap-1.5 items-center">
                                        {[0, 1, 2].map((i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ y: 0 }}
                                                animate={{ y: [0, -6, 0] }}
                                                transition={{
                                                    duration: 0.8,
                                                    repeat: Infinity,
                                                    delay: i * 0.15,
                                                    ease: "easeInOut"
                                                }}
                                                className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.6)]"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-white/5 flex gap-2 bg-black/20 backdrop-blur-xl">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask your mentor..."
                                className="flex-1 bg-white/5 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-white placeholder:text-muted-foreground/50 border border-white/10 transition-all focus:bg-white/10"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                                className="p-2 bg-primary rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                            >
                                {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AIAssistant;
