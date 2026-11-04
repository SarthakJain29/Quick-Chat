import type { Message } from "./types";

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today", "Yesterday", weekday within a week, else a short date. */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

/** Compact timestamp for the chat list: time today, otherwise day label. */
export function listTime(iso: string, now = new Date()): string {
  return dayLabel(iso, now) === "Today" ? formatTime(iso) : dayLabel(iso, now);
}

export interface MessageGroup {
  key: string;
  day: string;
  senderId: string;
  messages: Message[];
}

/**
 * Groups consecutive messages from the same sender (within 5 minutes, same day)
 * so avatars/timestamps render once per cluster instead of once per message.
 */
export function groupMessages(messages: Message[], now = new Date()): { day: string; groups: MessageGroup[] }[] {
  const days: { day: string; groups: MessageGroup[] }[] = [];
  for (const m of messages) {
    const label = dayLabel(m.createdAt, now);
    let bucket = days[days.length - 1];
    if (!bucket || bucket.day !== label) {
      bucket = { day: label, groups: [] };
      days.push(bucket);
    }
    const last = bucket.groups[bucket.groups.length - 1];
    const gap = last ? new Date(m.createdAt).getTime() - new Date(last.messages[last.messages.length - 1].createdAt).getTime() : Infinity;
    if (last && last.senderId === m.senderId && gap < 5 * 60_000) last.messages.push(m);
    else bucket.groups.push({ key: m.id, day: label, senderId: m.senderId, messages: [m] });
  }
  return days;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

/** Deterministic gradient per user so avatars are recognisable without photos. */
export function avatarGradient(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `linear-gradient(135deg, hsl(${h} 85% 62%), hsl(${(h + 55) % 360} 85% 58%))`;
}

export const previewText = (m: Message | null, mine: boolean) =>
  !m ? "No messages yet" : `${mine ? "You: " : ""}${m.text || "📷 Photo"}`;

/** Reads an image file as a data URL, rejecting non-images and large files up front. */
export function readImage(file: File, maxMb = 3): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Please choose an image file"));
    if (file.size > maxMb * 1024 * 1024) return reject(new Error(`Image is too large (max ${maxMb} MB)`));
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Couldn't read that file"));
    r.readAsDataURL(file);
  });
}
