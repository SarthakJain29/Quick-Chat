import { describe, expect, it } from "vitest";
import { appendUnique, applyMessageToChats, markMessagesSeen, replaceMessage, sortChats } from "./chatLogic";
import type { Chat, Message } from "../lib/types";

const user = (id: string, fullName = id) => ({ id, fullName, bio: "", profilePic: "", isBot: false });
const m = (id: string, s: string, r: string, at: string): Message => ({ id, senderId: s, receiverId: r, text: id, image: "", seen: false, reactions: {}, createdAt: at });
const chats = (): Chat[] => [
  { user: user("a", "Ann"), lastMessage: null, unseen: 0 },
  { user: user("b", "Bob"), lastMessage: m("old", "b", "me", "2025-01-01T00:00:00Z"), unseen: 0 },
];

describe("chat list logic", () => {
  it("sorts by recency then name", () => expect(sortChats(chats()).map((c) => c.user.id)).toEqual(["b", "a"]));
  it("bumps chat and increments unseen for incoming messages in a closed chat", () => {
    const out = applyMessageToChats(chats(), m("n", "a", "me", "2025-02-01T00:00:00Z"), "me", null);
    expect(out[0].user.id).toBe("a");
    expect(out[0].unseen).toBe(1);
  });
  it("does not add unseen when the chat is open", () => {
    expect(applyMessageToChats(chats(), m("n", "a", "me", "2025-02-01T00:00:00Z"), "me", "a")[0].unseen).toBe(0);
  });
  it("outgoing messages keep unseen untouched", () => {
    const base = chats();
    base[0].unseen = 3;
    const out = applyMessageToChats(base, m("n", "me", "a", "2025-02-01T00:00:00Z"), "me", null);
    expect(out[0].unseen).toBe(3);
  });
});

describe("message list logic", () => {
  const list = [m("1", "me", "a", "t"), m("2", "me", "a", "t")];
  it("marks seen", () => expect(markMessagesSeen(list, ["2"]).map((x) => x.seen)).toEqual([false, true]));
  it("replaces optimistic messages", () => expect(replaceMessage(list, "1", m("real", "me", "a", "t")).map((x) => x.id)).toEqual(["real", "2"]));
  it("dedupes appends", () => expect(appendUnique(list, list[0])).toHaveLength(2));
});
