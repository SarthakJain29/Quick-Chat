import { LogOut, Search, Settings, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listTime, previewText } from "../lib/format";
import { useAuth } from "../store/auth";
import { useChat } from "../store/chat";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";

function ListSkeleton() {
  return (
    <div className="space-y-3 p-3" aria-label="Loading chats">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton h-11 w-11 !rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatList() {
  const { user, signOut } = useAuth();
  const { chats, chatsStatus, online, selectedId, typing, select, loadChats } = useChat();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? chats.filter((c) => c.user.fullName.toLowerCase().includes(needle)) : chats;
  }, [chats, q]);

  return (
    <aside className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <Logo />
        <div className="flex items-center gap-1">
          <Link to="/profile" className="btn btn-ghost !p-2" aria-label="Edit profile" title="Edit profile"><Settings size={18} /></Link>
          <button onClick={signOut} className="btn btn-ghost !p-2" aria-label="Log out" title="Log out"><LogOut size={18} /></button>
        </div>
      </div>

      <div className="px-4 pb-3">
        <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 focus-within:border-violet/60">
          <Search size={16} className="text-white/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" aria-label="Search people" className="w-full bg-transparent text-sm outline-none placeholder:text-white/35" />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {chatsStatus === "loading" || chatsStatus === "idle" ? (
          <ListSkeleton />
        ) : chatsStatus === "error" && chats.length === 0 ? (
          <div className="p-6 text-center text-sm text-white/60">
            Couldn&apos;t load your chats.
            <button onClick={() => void loadChats()} className="btn btn-ghost mt-3 border border-white/15">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-white/50">{q ? `No one matches “${q}”` : "No one here yet. Invite a friend to sign up!"}</p>
        ) : (
          filtered.map((c) => {
            const isOnline = online.includes(c.user.id);
            const isTyping = typing[c.user.id];
            const active = selectedId === c.user.id;
            return (
              <button
                key={c.user.id}
                onClick={() => void select(c.user.id)}
                aria-current={active}
                className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${active ? "bg-white/10" : "hover:bg-white/5"}`}
              >
                <Avatar user={c.user} online={isOnline} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 truncate font-semibold">
                      {c.user.fullName}
                      {c.user.isBot && <span className="rounded-md bg-violet/25 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-violet-200"><Sparkles size={9} className="mr-0.5 inline" />AI</span>}
                    </span>
                    {c.lastMessage && <span className="shrink-0 text-[11px] text-white/40">{listTime(c.lastMessage.createdAt)}</span>}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${isTyping ? "text-cyan" : c.unseen ? "text-white" : "text-white/50"}`}>
                      {isTyping ? "typing…" : previewText(c.lastMessage, c.lastMessage?.senderId === user?.id)}
                    </span>
                    {c.unseen > 0 && <span className="grad-bg grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold">{c.unseen}</span>}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      {user && (
        <Link to="/profile" className="m-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10">
          <Avatar user={user} size={38} online />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{user.fullName}</span>
            <span className="block truncate text-xs text-white/45">{user.bio || "Add a bio"}</span>
          </span>
        </Link>
      )}
    </aside>
  );
}
