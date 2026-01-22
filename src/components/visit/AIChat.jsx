import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Bot, X, Send, Minus, Maximize2, Loader2, MessageSquare } from "lucide-react";
import { chatWithAI } from '@/lib/gemini';
import { Logger } from '@/lib/logger';

export default function AIChat({ visit, results, dosages, isOpen, onClose }) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'model', content: 'Olá! Sou seu assistente técnico. Como posso ajudar com a análise desta visita?' }
    ]);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, isMinimized]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];

        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            // Prepare Context
            const resultsText = results?.map(r =>
                `- ${r.test_name}: ${r.measured_value} ${r.unit} [${r.status_light}]`
            ).join('\n');

            const dosagesText = dosages?.map(d =>
                `- ${d.product_name}: ${d.dosage_applied}`
            ).join('\n');

            const contextData = {
                client: visit.client,
                resultsText,
                dosagesText
            };

            const responseText = await chatWithAI(newMessages, contextData);

            setMessages(prev => [...prev, { role: 'model', content: responseText }]);
        } catch (error) {
            console.error("AI Chat Error:", error);
            setMessages(prev => [...prev, { role: 'model', content: 'Desculpe, tive um erro ao processar sua pergunta. Tente novamente.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    if (isMinimized) {
        return (
            <div className="fixed bottom-20 right-4 z-50">
                <Button
                    className="rounded-full w-14 h-14 bg-purple-600 hover:bg-purple-700 shadow-lg flex items-center justify-center p-0"
                    onClick={() => setIsMinimized(false)}
                >
                    <Bot className="w-8 h-8 text-white" />
                </Button>
            </div>
        );
    }

    return (
        <Card className="fixed bottom-20 right-4 w-80 md:w-96 h-[500px] z-50 flex flex-col shadow-2xl border-purple-200">
            <CardHeader className="bg-purple-600 text-white p-3 rounded-t-lg flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    Assistente Técnico WGA
                </CardTitle>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-purple-500" onClick={() => setIsMinimized(true)}>
                        <Minus className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-purple-500" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[85%] rounded-lg p-3 text-sm ${msg.role === 'user'
                                    ? 'bg-purple-600 text-white rounded-br-none'
                                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                                }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 rounded-lg p-3 rounded-bl-none shadow-sm flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                            <span className="text-xs text-slate-500">Digitando...</span>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="p-3 bg-white border-t">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex w-full gap-2"
                >
                    <Input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Pergunte sobre a visita..."
                        className="flex-1 text-sm focus-visible:ring-purple-600"
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="bg-purple-600 hover:bg-purple-700">
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
}
