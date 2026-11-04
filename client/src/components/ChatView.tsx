import { ArrowDown, ArrowLeft, MessageCircle, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { groupMessages } from "../lib/format";
import { useAuth } from "../store/auth";
import { useChat } from "../store/chat";
import { Avatar } from "./Avatar";
import { Composer } from "./Composer";
import { MessageBubble } from "./MessageBubble";

const STARTERS = ["👋 Say hello", "Ask what they're working on", "Share a photo"];

export function EmptyState() {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div className="max-w-sm animate-rise">
        <div className="grad-bg mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl shadow-[0_20px_60px_-15px_rgb(139_92_246/.8)]"><MessageCircle size={36} /></div>
        <h2 className="font-display text-3xl font-extrabold tracking-tight">Pick a <span className="grad-text">conversation</span></h2>
        <p className="mt-3 text-white/55">Choose someone from the left, or try <b className="text-white">Quick AI</b> for instant replies. No account needed to look around: the demo login is on the sign-in page.</p>
      </div>
    </div>
  );
}

export function ChatView({ onOpenImage, onToggleInfo }: { onOpenImage: (s: string) => void; onToggleInfo: () => void }) {
  const me = useAuth((s) => s.user)!;
  const { chats, selectedId, messages, messagesStatus, online, typing, select } = useChat();
  const chat = chats.find((c) => c.user.id === selectedId);
  const scroller = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const days = useMemo(() => groupMessages(messages), [messages]);
  const lastIncoming = [...messages].reverse().find((m) => m.senderId !== me.id && !m.status);
  const peerTyping = selectedId ? typing[selectedId] : false;

  // Stick to the bottom for new content, unless the user scrolled up to read history.
  useEffect(() => {
    const el = scroller.current;
    if (el && atBottom) el.scrollTo({ top: el.scrollHeight, behavior: messagesStatus === "ready" ? "smooth" : "auto" });
  }, [messages, peerTyping, atBottom, messagesStatus]);
  useEffect(() => setAtBottom(true), [selectedId]);

  if (!chat) return <EmptyState />;
  const isOnline = online.includes(chat.user.id);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-white/8 px-3 py-3 sm:px-5">
        <button onClick={() => void select(null)} className="btn btn-ghost !p-2 md:hidden" aria-label="Back to chats"><ArrowLeft size={20} /></button>
        <button onClick={onToggleInfo} className="flex min-w-0 items-center gap-3 text-left">
          <Avatar user={chat.user} size={42} online={isOnline} />
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-bold leading-tight">{chat.user.fullName}</span>
            <span className={`block text-xs ${peerTyping ? "text-cyan" : isOnline ? "text-lime" : "text-white/40"}`}>{peerTyping ? "typing…" : isOnline ? "Online" : "Offline"}</span>
          </span>
        </button>
        <button onClick={onToggleInfo} className="btn btn-ghost ml-auto !p-2 xl:hidden" aria-label="Chat details"><Sparkles size={18} /></button>
      </header>

      <div className="relative min-h-0 flex-1">
        <div ref={scroller} onScroll={(e) => { const el = e.currentTarget; setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80); }} className="h-full overflow-y-auto px-3 py-4 sm:px-6" role="log" aria-live="polite">
          {messagesStatus === "loading" ? (
            <div className="space-y-4">{[0, 1, 2, 3].map((i) => <div key={i} className={`skeleton h-11 ${i % 2 ? "ml-auto w-1/2" : "w-2/5"}`} />)}</div>
          ) : messagesStatus === "error" ? (
            <div className="grid h-full place-items-center text-center text-white/60"><div>Couldn&apos;t load this conversation.<button onClick={() => void select(chat.user.id)} className="btn btn-ghost mt-3 block border border-white/15">Retry</button></div></div>
          ) : messages.length === 0 ? (
            <div className="grid h-full place-items-center text-center"><div className="max-w-xs animate-rise"><Avatar user={chat.user} size={72} /><p className="mt-4 font-display text-xl font-bold">This is the start of your chat with {chat.user.fullName.split(" ")[0]}</p><p className="mt-2 text-sm text-white/50">{STARTERS.join(" · ")}</p></div></div>
          ) : (
            days.map((d) => (
              <div key={d.day}>
                <div className="my-4 flex justify-center"><span className="rounded-full bg-white/6 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white/45">{d.day}</span></div>
                {d.groups.map((g) =>
                  g.messages.map((m, i) => (
                    <MessageBubble key={m.id} message={m} mine={m.senderId === me.id} myId={me.id} first={i === 0} last={i === g.messages.length - 1} onOpenImage={onOpenImage} />
                  )),
                )}
              </div>
            ))
          )}
          {peerTyping && (
            <div className="mb-2 inline-flex items-center gap-1 rounded-2xl rounded-bl-md bg-white/8 px-4 py-3" aria-label="Typing">
              {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/70" style={{ animation: `bounce-dot 1.1s ${i * 0.15}s infinite` }} />)}
            </div>
          )}
        </div>
        {!atBottom && (
          <button onClick={() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" })} className="glass absolute bottom-3 right-5 grid h-10 w-10 animate-pop place-items-center rounded-full bg-[#171428]/90" aria-label="Scroll to latest"><ArrowDown size={18} /></button>
        )}
      </div>

      <Composer peerId={chat.user.id} lastIncomingId={lastIncoming?.id} />
    </section>
  );
}

export function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!src) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [src, onClose]);
  if (!src) return null;
  return (
    <div className="fixed inset-0 z-50 grid animate-pop place-items-center bg-black/85 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-label="Image preview">
      <button className="btn btn-ghost absolute right-4 top-4 !p-2" aria-label="Close"><X size={24} /></button>
      <img src={src} alt="Full size" className="max-h-full max-w-full rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
