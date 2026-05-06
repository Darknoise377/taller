"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

// ──────────────────────────────────────────────
// ChatWidget
// Inline SVG icons (sin dependencias extra)
function BotIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M9 11V7a3 3 0 0 1 6 0v4" />
      <circle cx="9" cy="16" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 5h0" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
    </svg>
  );
}

// ──────────────────────────────────────────────
// Renders text with clickable URLs, WhatsApp numbers and **bold** markdown
// ──────────────────────────────────────────────
function MessageText({ text }: { text: string }) {
  // Matches: https URLs  OR  Colombian phone numbers like "301 527 1104", "3015271104", "+57 301..."
  const TOKEN_RE = /(https?:\/\/[^\s)>\]]+|(?:\+57[\s-]?)?3\d{2}[\s-]?\d{3}[\s-]?\d{4})/g;

  const renderBold = (segment: string, key: string) => {
    const parts = segment.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={`${key}-b${i}`}>{part.slice(2, -2)}</strong>;
      }
      return <span key={`${key}-s${i}`}>{part}</span>;
    });
  };

  const segments = text.split(TOKEN_RE);
  return (
    <span className="whitespace-pre-wrap break-words">
      {segments.map((seg, i) => {
        if (!seg) return null;
        // HTTPS URL
        if (/^https?:\/\//.test(seg)) {
          return (
            <a
              key={i}
              href={seg}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-80 break-all"
            >
              {seg}
            </a>
          );
        }
        // Phone number → WhatsApp link
        if (/^(\+57[\s-]?)?3\d{2}[\s-]?\d{3}[\s-]?\d{4}$/.test(seg)) {
          const digits = seg.replace(/\D/g, '');
          const wa = digits.startsWith('57') ? digits : `57${digits}`;
          return (
            <a
              key={i}
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-80"
            >
              {seg}
            </a>
          );
        }
        return <span key={i}>{renderBold(seg, String(i))}</span>;
      })}
    </span>
  );
}


const SUGGESTIONS = [
  "¿Qué filtros de aceite tienen?",
  "Necesito frenos para Honda CB125",
  "¿Cuánto cuesta una llanta trasera?",
  "Kit de arrastre disponible",
];

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  const { messages, sendMessage, stop, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: () => {
      if (!open) setHasNewMessage(true);
    },
    onError: (err: Error) => {
      console.error("[ChatWidget] error:", err);
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setHasNewMessage(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Hide on admin and checkout
  if (pathname.startsWith("/admin") || pathname.startsWith("/checkout")) return null;

  const isEmpty = messages.length === 0;

  return (
    <>
      {/* ── Floating button ── */}
      <div className="fixed bottom-20 md:bottom-6 left-4 z-40">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar asistente IA" : "Abrir asistente IA"}
          className="relative w-14 h-14 rounded-full bg-[#0A2A66] shadow-lg shadow-[#0A2A66]/30 flex items-center justify-center hover:scale-110 hover:shadow-xl hover:shadow-[#0A2A66]/40 transition-all duration-300 text-white"
        >
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <CloseIcon />
              </motion.span>
            ) : (
              <motion.span
                key="bot"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <BotIcon className="w-7 h-7" />
              </motion.span>
            )}
          </AnimatePresence>

          {/* Notification dot */}
          {hasNewMessage && !open && (
            <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
          )}
        </button>
      </div>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-36 md:bottom-24 left-4 z-40 w-[calc(100vw-2rem)] max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
            style={{ maxHeight: "min(520px, calc(100vh - 10rem))" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#0A2A66] text-white flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                <BotIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">Asistente A&R</p>
                <p className="text-xs text-blue-200 leading-tight">Repuestos y accesorios para moto</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar chat"
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {isEmpty ? (
                <div className="space-y-3">
                  {/* Welcome */}
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#0A2A66]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BotIcon className="w-4 h-4 text-[#0A2A66]" />
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-slate-700 dark:text-slate-200 max-w-[85%]">
                      ¡Hola! Soy el asistente de <strong>Motoservicio A&R</strong>. Puedo ayudarte a
                      encontrar repuestos y responder tus dudas. ¿En qué puedo ayudarte?
                    </div>
                  </div>

                  {/* Suggestions */}
                  <div className="flex flex-wrap gap-2 pl-9">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setInput(s);
                          inputRef.current?.focus();
                        }}
                        className="text-xs px-3 py-1.5 rounded-full border border-[#0A2A66]/30 text-[#0A2A66] dark:text-blue-300 dark:border-blue-700 hover:bg-[#0A2A66]/5 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg: UIMessage) => {
                  const isUser = msg.role === "user";
                  // v6 UIMessage: content comes from parts (type: 'text')
                  type TextPart = { type: string; text?: string };
                  const textContent = Array.isArray(msg.parts)
                    ? (msg.parts as TextPart[])
                        .filter((p) => p.type === "text")
                        .map((p) => p.text ?? "")
                        .join("")
                    : "";

                  if (!textContent && !isUser) return null;

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-full bg-[#0A2A66]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <BotIcon className="w-4 h-4 text-[#0A2A66]" />
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-3 py-2 text-sm max-w-[85%] leading-relaxed ${
                          isUser
                            ? "bg-[#0A2A66] text-white rounded-tr-sm"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-sm"
                        }`}
                      >
                        <MessageText text={textContent} />
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#0A2A66]/10 flex items-center justify-center flex-shrink-0">
                    <BotIcon className="w-4 h-4 text-[#0A2A66]" />
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-3 py-2">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const text = input.trim();
                if (!text || isLoading) return;
                sendMessage({ text });
                setInput("");
              }}
              className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-200 dark:border-slate-700 flex-shrink-0"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta..."
                disabled={isLoading}
                maxLength={500}
                className="flex-1 text-sm bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-[#0A2A66]/40 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 disabled:opacity-60"
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={stop}
                  aria-label="Detener respuesta"
                  className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-red-100 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <SpinnerIcon />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Enviar mensaje"
                  className="w-9 h-9 rounded-full bg-[#0A2A66] flex items-center justify-center text-white hover:bg-[#0d3580] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <SendIcon />
                </button>
              )}
            </form>

            {/* Footer note */}
            <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 pb-2 flex-shrink-0">
              Respuestas generadas por IA · Verifica disponibilidad antes de comprar
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
