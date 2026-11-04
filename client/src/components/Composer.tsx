import { ImagePlus, Loader2, SendHorizontal, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api, errorMessage } from "../lib/api";
import { readImage } from "../lib/format";
import type { Tone } from "../lib/types";
import { useChat } from "../store/chat";

const TONES: { id: Tone; label: string; emoji: string }[] = [
  { id: "friendly", label: "Friendly", emoji: "😊" },
  { id: "professional", label: "Professional", emoji: "💼" },
  { id: "concise", label: "Concise", emoji: "✂️" },
  { id: "playful", label: "Playful", emoji: "🎉" },
];

export function Composer({ peerId, lastIncomingId }: { peerId: string; lastIncomingId?: string }) {
  const { send, setTyping } = useChat();
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [toneOpen, setToneOpen] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const stopTyping = useRef<ReturnType<typeof setTimeout>>(undefined);

  // New incoming message => fresh suggestions (guarded so stale responses never win).
  useEffect(() => {
    setSuggestions([]);
    if (!lastIncomingId) return;
    let live = true;
    setLoadingReplies(true);
    api.smartReplies(peerId).then((r) => live && setSuggestions(r)).catch(() => undefined).finally(() => live && setLoadingReplies(false));
    return () => { live = false; };
  }, [peerId, lastIncomingId]);

  useEffect(() => { setText(""); setToneOpen(false); }, [peerId]);

  // Auto-grow textarea.
  useEffect(() => {
    const el = areaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 140) + "px"; }
  }, [text]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    setText(""); setSuggestions([]); setTyping(false);
    void send({ text: t });
  };

  const onChange = (v: string) => {
    setText(v);
    setTyping(true);
    clearTimeout(stopTyping.current);
    stopTyping.current = setTimeout(() => setTyping(false), 2500);
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    try { void send({ image: await readImage(file) }); } catch (e) { toast.error(errorMessage(e)); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const rewrite = async (tone: Tone) => {
    setToneOpen(false);
    setRewriting(true);
    try { setText(await api.rewrite(text, tone)); } catch (e) { toast.error(errorMessage(e)); } finally { setRewriting(false); }
  };

  return (
    <div className="px-3 pb-3 pt-1 sm:px-5 sm:pb-5">
      {(loadingReplies || suggestions.length > 0) && (
        <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1" aria-label="Suggested replies">
          <Sparkles size={14} className="shrink-0 text-violet-300" />
          {loadingReplies && suggestions.length === 0
            ? [60, 80, 70].map((w, i) => <span key={i} className="skeleton h-8 shrink-0 !rounded-full" style={{ width: w + 40 }} />)
            : suggestions.map((s) => (
                <button key={s} onClick={() => { setText(s); areaRef.current?.focus(); }} className="shrink-0 animate-rise rounded-full border border-violet/40 bg-violet/15 px-3.5 py-1.5 text-sm text-violet-100 transition hover:bg-violet/30">
                  {s}
                </button>
              ))}
        </div>
      )}

      <div className="glass relative flex items-end gap-1 rounded-3xl p-1.5">
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
        <button onClick={() => fileRef.current?.click()} className="btn btn-ghost !h-10 !w-10 !p-0" aria-label="Send an image" title="Send an image"><ImagePlus size={19} /></button>

        <textarea
          ref={areaRef}
          rows={1}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
          placeholder="Message…  (Enter to send, Shift+Enter for a new line)"
          aria-label="Message"
          maxLength={2000}
          className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] outline-none placeholder:text-white/30"
        />

        <div className="relative">
          <button
            onClick={() => setToneOpen((o) => !o)}
            disabled={!text.trim() || rewriting}
            className="btn btn-ghost !h-10 !w-10 !p-0 disabled:opacity-30"
            aria-label="Rewrite with AI" title="Rewrite with AI"
          >
            {rewriting ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
          </button>
          {toneOpen && (
            <div className="glass absolute bottom-12 right-0 z-20 w-44 animate-pop rounded-2xl bg-[#171428]/95 p-1.5 shadow-2xl">
              <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Rewrite tone</p>
              {TONES.map((t) => (
                <button key={t.id} onClick={() => void rewrite(t.id)} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm hover:bg-white/10">
                  <span>{t.emoji}</span>{t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={submit} disabled={!text.trim()} className="btn btn-primary !h-10 !w-10 !p-0" aria-label="Send message"><SendHorizontal size={18} /></button>
      </div>
    </div>
  );
}
