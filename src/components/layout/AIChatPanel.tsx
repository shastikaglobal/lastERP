// =========================================
// E:\ERP\src\components\layout\AIChatPanel.tsx
// =========================================

import { useRef, useEffect, useState } from "react";
import { Bot, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function AIChatPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I am your Shastika ERP Assistant. How can I help you today?",
    },
  ]);

  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = async () => {

    if (!input.trim() || loading) return;

    const userMsg: Message = {
      role: "user",
      content: input,
    };

    const history = [...messages, userMsg];

    setMessages(history);

    setInput("");

    setLoading(true);

    try {

      const res = await fetch(
        "/api/ai-chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: input,
          }),
        }
      );

      const data = await res.json();

      setMessages([
        ...history,
        {
          role: "assistant",
          content:
            data.reply || "No response from AI",
        },
      ]);

    } catch (error) {

      console.error(error);

      setMessages([
        ...history,
        {
          role: "assistant",
          content:
            "AI server not reachable",
        },
      ]);

    } finally {

      setLoading(false);

    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed bottom-6 z-50 w-80 h-[480px] bg-background border border-border rounded-xl shadow-2xl flex flex-col print:hidden"
      style={{ left: "272px" }}
    >

      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar rounded-t-xl">

        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-white">
            AI Assistant
          </span>
        </div>

        <button onClick={onClose}>
          <X className="h-4 w-4 text-sidebar-muted hover:text-white" />
        </button>

      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {messages.map((m, i) => (

          <div
            key={i}
            className={cn(
              "flex",
              m.role === "user"
                ? "justify-end"
                : "justify-start"
            )}
          >

            <div
              className={cn(
                "max-w-[75%] px-3 py-2 rounded-xl text-xs leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-muted text-foreground rounded-bl-none"
              )}
            >
              {m.content}
            </div>

          </div>

        ))}

        {loading && (

          <div className="flex justify-start">

            <div className="bg-muted px-3 py-2 rounded-xl rounded-bl-none">

              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />

            </div>

          </div>

        )}

        <div ref={bottomRef} />

      </div>

      <div className="p-3 border-t border-border flex gap-2">

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && sendMessage()
          }
          placeholder="Ask anything..."
          className="flex-1 text-xs bg-muted rounded-lg px-3 py-2 outline-none text-foreground placeholder:text-muted-foreground"
        />

        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:opacity-90 disabled:opacity-50"
        >

          <Send className="h-3 w-3" />

        </button>

      </div>

    </div>
  );
}




