import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({ meta: [{ title: "AI Assistant — CognifyAI" }] }),
  component: AIAssistant,
});

type Msg = { role: "user" | "ai"; text: string };

const starters = [
  "How do I improve ATS score?",
  "What skills should I learn?",
  "What jobs fit my profile?",
  "Suggest a learning path",
];

function AIAssistant() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    async function loadUserGreeting() {
      try {
        const profile = await api.getProfile();
        const name = profile?.name || localStorage.getItem("userName") || "User";
        setUserName(name);
        setMsgs([
          { role: "ai", text: `Hi ${name}! I'm your AI career assistant. How can I help you grow today?` }
        ]);
      } catch (_) {
        setMsgs([
          { role: "ai", text: "Hi! I'm your AI career assistant. How can I help you grow today?" }
        ]);
      }
    }
    loadUserGreeting();
  }, []);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    // Add user message
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.sendChatMessage(text);
      setMsgs((m) => [...m, { role: "ai", text: response.reply }]);
    } catch (err: any) {
      console.error(err);
      setMsgs((m) => [
        ...m,
        { role: "ai", text: "I ran into a problem communicating with the AI. Please verify your connection and try again." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <PageHeader title="AI Assistant" back="/home" />

      <div className="space-y-4 mb-24 pb-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                m.role === "user"
                  ? "bg-gradient-primary text-white shadow-glow rounded-br-sm"
                  : "bg-card shadow-card rounded-bl-sm border border-border/10"
              }`}
            >
              {m.role === "ai" && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> CognifyAI
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-line">{m.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-card shadow-card rounded-bl-sm border border-border/10 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground font-semibold">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {msgs.length <= 1 && (
        <div className="mb-4 pr-2">
          <p className="text-[10px] font-bold tracking-wider text-muted-foreground mb-2.5 uppercase">Suggested Topics</p>
          <div className="flex flex-wrap gap-2">
            {starters.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={loading}
                className="text-xs px-3.5 py-2.5 rounded-xl bg-card shadow-card hover:bg-muted/10 transition-colors border border-border/20 cursor-pointer disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-24 flex gap-2 pt-2 bg-background/90 backdrop-blur-sm"
      >
        <input
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your resume, skills, or career goals..."
          className="flex-1 h-14 rounded-2xl bg-card shadow-card px-4 border border-border/30 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold disabled:opacity-50"
        />
        <button 
          type="submit"
          disabled={loading}
          className="h-14 w-14 rounded-2xl bg-gradient-primary text-white flex items-center justify-center shadow-glow border-0 cursor-pointer disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </AppShell>
  );
}
