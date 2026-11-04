import { AlertCircle, Check, CheckCheck, Clock, Smile } from "lucide-react";
import { useState } from "react";
import { formatTime } from "../lib/format";
import { REACTIONS, type Message } from "../lib/types";
import { useChat } from "../store/chat";

interface Props {
  message: Message;
  mine: boolean;
  myId: string;
  first: boolean;
  last: boolean;
  onOpenImage: (src: string) => void;
}

export function MessageBubble({ message: m, mine, myId, first, last, onOpenImage }: Props) {
  const { react, retry } = useChat();
  const [picker, setPicker] = useState(false);
  const reactions = Object.entries(m.reactions);
  const radius = mine
    ? `rounded-2xl ${first ? "" : "rounded-tr-md"} ${last ? "rounded-br-md" : "rounded-br-md"}`
    : `rounded-2xl ${first ? "" : "rounded-tl-md"} ${last ? "rounded-bl-md" : "rounded-bl-md"}`;

  return (
    <div className={`group flex animate-pop items-end gap-1.5 ${mine ? "flex-row-reverse" : ""} ${last ? "mb-3" : "mb-0.5"}`}>
      <div className={`relative max-w-[78%] sm:max-w-[65%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
        {m.image ? (
          <button onClick={() => onOpenImage(m.image)} className={`overflow-hidden border border-white/10 ${radius}`} aria-label="Open image">
            <img src={m.image} alt="Shared" loading="lazy" className="max-h-72 w-full object-cover" />
          </button>
        ) : (
          <p className={`whitespace-pre-wrap break-words px-3.5 py-2 text-[15px] leading-snug ${radius} ${mine ? "grad-bg text-white" : "bg-white/8 text-white/95"} ${m.status === "failed" ? "opacity-60" : ""}`}>
            {m.text}
          </p>
        )}

        {reactions.length > 0 && (
          <div className={`-mt-2 flex gap-1 ${mine ? "mr-2" : "ml-2"}`}>
            {reactions.map(([emoji, ids]) => (
              <button
                key={emoji}
                onClick={() => void react(m.id, emoji)}
                className={`rounded-full border px-1.5 py-0.5 text-xs backdrop-blur ${ids.includes(myId) ? "border-violet/70 bg-violet/30" : "border-white/10 bg-[#1a1730]"}`}
                aria-label={`${emoji} ${ids.length}`}
              >
                {emoji} {ids.length > 1 && ids.length}
              </button>
            ))}
          </div>
        )}

        {last && (
          <span className={`mt-1 flex items-center gap-1 text-[11px] text-white/40 ${mine ? "flex-row-reverse" : ""}`}>
            {formatTime(m.createdAt)}
            {mine && m.status === "sending" && <Clock size={11} aria-label="Sending" />}
            {mine && !m.status && (m.seen ? <CheckCheck size={13} className="text-cyan" aria-label="Seen" /> : <Check size={13} aria-label="Sent" />)}
          </span>
        )}
        {m.status === "failed" && (
          <button onClick={() => void retry(m.id)} className="mt-1 flex items-center gap-1 text-xs text-red-300 hover:underline">
            <AlertCircle size={12} /> Not delivered. Tap to retry
          </button>
        )}
      </div>

      {!m.status && (
        <div className="relative opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-60">
          <button onClick={() => setPicker((p) => !p)} className="grid h-7 w-7 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white" aria-label="Add reaction">
            <Smile size={15} />
          </button>
          {picker && (
            <div className={`glass absolute bottom-9 z-20 flex animate-pop gap-0.5 rounded-full bg-[#171428]/95 p-1 shadow-xl ${mine ? "right-0" : "left-0"}`}>
              {REACTIONS.map((e) => (
                <button key={e} onClick={() => { setPicker(false); void react(m.id, e); }} className="grid h-8 w-8 place-items-center rounded-full text-lg transition hover:scale-125 hover:bg-white/10">
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
