import { describe, expect, it } from "vitest";
import { dayLabel, groupMessages, initials, listTime, previewText } from "./format";
import type { Message } from "./types";

const now = new Date("2025-06-15T12:00:00");
const msg = (id: string, senderId: string, iso: string, text = id): Message => ({
  id, senderId, receiverId: "x", text, image: "", seen: false, reactions: {}, createdAt: new Date(iso).toISOString(),
});

describe("dayLabel", () => {
  it("labels today / yesterday / weekday / older", () => {
    expect(dayLabel("2025-06-15T01:00:00", now)).toBe("Today");
    expect(dayLabel("2025-06-14T23:00:00", now)).toBe("Yesterday");
    expect(dayLabel("2025-06-11T10:00:00", now)).toMatch(/Wednesday/);
    expect(dayLabel("2025-01-02T10:00:00", now)).toMatch(/Jan/);
    expect(dayLabel("2024-01-02T10:00:00", now)).toMatch(/2024/);
  });
  it("listTime shows a clock only for today", () => {
    expect(listTime("2025-06-14T10:00:00", now)).toBe("Yesterday");
    expect(listTime("2025-06-15T10:00:00", now)).toMatch(/10:00/);
  });
});

describe("groupMessages", () => {
  it("clusters same-sender messages within 5 minutes", () => {
    const out = groupMessages([msg("1", "a", "2025-06-15T10:00:00"), msg("2", "a", "2025-06-15T10:02:00"), msg("3", "b", "2025-06-15T10:03:00"), msg("4", "a", "2025-06-15T10:30:00")], now);
    expect(out).toHaveLength(1);
    expect(out[0].groups.map((g) => g.messages.length)).toEqual([2, 1, 1]);
  });
  it("splits by day", () => {
    const out = groupMessages([msg("1", "a", "2025-06-14T10:00:00"), msg("2", "a", "2025-06-15T10:00:00")], now);
    expect(out.map((d) => d.day)).toEqual(["Yesterday", "Today"]);
  });
  it("handles empty input", () => expect(groupMessages([], now)).toEqual([]));
});

describe("helpers", () => {
  it("initials", () => {
    expect(initials("alison rivera")).toBe("AR");
    expect(initials("  Marco ")).toBe("M");
  });
  it("previewText", () => {
    expect(previewText(null, false)).toBe("No messages yet");
    expect(previewText(msg("1", "a", "2025-06-15T10:00:00", "hey"), true)).toBe("You: hey");
    expect(previewText({ ...msg("1", "a", "2025-06-15T10:00:00", ""), image: "x" }, false)).toBe("📷 Photo");
  });
});
