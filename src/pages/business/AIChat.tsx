import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import Layout from "../../components/Layout";
import { askGroq } from "../../lib/groq";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function BusinessAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await askGroq(trimmed);
      const reply = data.choices?.[0]?.message?.content ?? "No response received.";
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: `Error: ${(err as Error).message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="AI Chat">
      <div className="max-w-2xl mx-auto">
        <div className="glass rounded-2xl flex flex-col h-[calc(100vh-220px)] min-h-[400px]">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
            <Sparkles className="w-5 h-5 text-accent-500" />
            <h2 className="font-semibold text-slate-100">Groq AI Assistant</h2>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.length === 0 && !loading && (
              <div className="text-center text-slate-500 mt-12">
                <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Ask anything — powered by Groq's Llama 3.3 70B.</p>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary-500/20 border border-primary-500/30 text-slate-100"
                      : "bg-white/5 border border-white/10 text-slate-200"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-accent-500" />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-white/10 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              disabled={loading}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent-500/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-accent-500 hover:bg-accent-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
