import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api, errorMessage } from "../lib/api";
import { useChat } from "../store/chat";
import { Avatar } from "./Avatar";

export function InfoPanel({ onOpenImage }: { onOpenImage: (s: string) => void }) {
  const { chats, selectedId, messages, online } = useChat();
  const chat = chats.find((c) => c.user.id === selectedId);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const images = useMemo(() => messages.filter((m) => m.image).map((m) => m.image).reverse(), [messages]);

  useEffect(() => setSummary(""), [selectedId]);
  if (!chat) return null;

  const summarize = async () => {
    setLoading(true);
    try { setSummary(await api.summary(chat.user.id)); } catch (e) { toast.error(errorMessage(e)); } finally { setLoading(false); }
  };

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-y-auto p-6">
      <div className="flex flex-col items-center text-center">
        <Avatar user={chat.user} size={92} online={online.includes(chat.user.id)} />
        <h2 className="mt-4 font-display text-xl font-bold">{chat.user.fullName}</h2>
        <p className="mt-1 text-sm text-white/55">{chat.user.bio || "No bio yet"}</p>
      </div>

      <section className="mt-7">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/40"><Sparkles size={12} /> AI summary</h3>
        {summary ? (
          <p className="glass animate-rise whitespace-pre-line rounded-2xl p-3.5 text-sm leading-relaxed text-white/80">{summary}</p>
        ) : (
          <button onClick={() => void summarize()} disabled={loading || messages.length === 0} className="btn btn-ghost w-full border border-white/15">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Summarize this chat
          </button>
        )}
        {summary && <button onClick={() => void summarize()} disabled={loading} className="mt-2 text-xs text-white/40 hover:text-white">{loading ? "Refreshing…" : "Refresh"}</button>}
      </section>

      <section className="mt-7">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Shared media {images.length > 0 && `· ${images.length}`}</h3>
        {images.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-white/35">Photos you share will appear here</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {images.map((src, i) => (
              <button key={i} onClick={() => onOpenImage(src)} className="aspect-square overflow-hidden rounded-xl border border-white/10">
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-110" />
              </button>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
