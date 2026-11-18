import mongoose, { Schema } from "mongoose";
import type { Message, NewMessage, StoredUser, User } from "../types.js";
import type { NewUser, Store } from "./Store.js";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    fullName: { type: String, required: true },
    passwordHash: { type: String, required: true },
    profilePic: { type: String, default: "" },
    bio: { type: String, default: "" },
    isBot: { type: Boolean, default: false },
    persona: { type: String },
  },
  { timestamps: true },
);

const messageSchema = new Schema(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    image: { type: String, default: "" },
    seen: { type: Boolean, default: false },
    reactions: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false },
);
// Conversation lookups always filter on the pair and sort by time.
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });

const UserModel = mongoose.models.QcUser ?? mongoose.model("QcUser", userSchema, "users");
const MessageModel = mongoose.models.QcMessage ?? mongoose.model("QcMessage", messageSchema, "messages");

/* eslint-disable @typescript-eslint/no-explicit-any */
const toUser = (d: any): StoredUser => ({
  id: String(d._id),
  email: d.email,
  fullName: d.fullName,
  bio: d.bio ?? "",
  profilePic: d.profilePic ?? "",
  isBot: !!d.isBot,
  persona: d.persona ?? undefined,
  passwordHash: d.passwordHash,
  createdAt: new Date(d.createdAt).toISOString(),
});
const strip = (u: StoredUser): User => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = u;
  return rest;
};
const toMessage = (d: any): Message => ({
  id: String(d._id),
  senderId: String(d.senderId),
  receiverId: String(d.receiverId),
  text: d.text ?? "",
  image: d.image ?? "",
  seen: !!d.seen,
  reactions: d.reactions ?? {},
  createdAt: new Date(d.createdAt).toISOString(),
});
const validId = (id: string) => mongoose.isValidObjectId(id);

export class MongoStore implements Store {
  readonly kind = "mongo" as const;

  static async connect(uri: string) {
    await mongoose.connect(uri, { dbName: "chat-app", serverSelectionTimeoutMS: 8000 });
    return new MongoStore();
  }

  async createUser(data: NewUser) {
    const d = await UserModel.create({ ...data });
    return toUser(d);
  }
  async findUserByEmail(email: string) {
    const d = await UserModel.findOne({ email: email.toLowerCase() });
    return d ? toUser(d) : null;
  }
  async findUserById(id: string) {
    if (!validId(id)) return null;
    const d = await UserModel.findById(id);
    return d ? toUser(d) : null;
  }
  async listUsers() {
    return (await UserModel.find()).map((d: any) => strip(toUser(d)));
  }
  async updateUser(id: string, patch: Partial<Pick<User, "fullName" | "bio" | "profilePic">>) {
    if (!validId(id)) return null;
    const d = await UserModel.findByIdAndUpdate(id, patch, { new: true });
    return d ? strip(toUser(d)) : null;
  }

  async createMessage(data: NewMessage) {
    return toMessage(await MessageModel.create(data));
  }
  async getMessage(id: string) {
    if (!validId(id)) return null;
    const d = await MessageModel.findById(id);
    return d ? toMessage(d) : null;
  }
  async listConversation(a: string, b: string, limit = 200) {
    const docs = await MessageModel.find({
      $or: [
        { senderId: a, receiverId: b },
        { senderId: b, receiverId: a },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit);
    return docs.reverse().map(toMessage);
  }
  async markSeen(from: string, to: string) {
    const filter = { senderId: from, receiverId: to, seen: false };
    const ids = (await MessageModel.find(filter).select("_id")).map((d: any) => String(d._id));
    if (ids.length) await MessageModel.updateMany({ _id: { $in: ids } }, { seen: true });
    return ids;
  }
  async toggleReaction(messageId: string, userId: string, emoji: string) {
    const m = await this.getMessage(messageId);
    if (!m) return null;
    const list = m.reactions[emoji] ?? [];
    const next = list.includes(userId) ? list.filter((i) => i !== userId) : [...list, userId];
    const reactions = { ...m.reactions };
    if (next.length) reactions[emoji] = next;
    else delete reactions[emoji];
    await MessageModel.updateOne({ _id: messageId }, { reactions });
    return { ...m, reactions };
  }
  async conversationSummaries(userId: string) {
    const oid = new mongoose.Types.ObjectId(userId);
    const docs = await MessageModel.find({ $or: [{ senderId: oid }, { receiverId: oid }] }).sort({ createdAt: 1 });
    const out: Record<string, { lastMessage: Message; unseen: number }> = {};
    for (const d of docs) {
      const m = toMessage(d);
      const other = m.senderId === userId ? m.receiverId : m.senderId;
      const e = out[other] ?? { lastMessage: m, unseen: 0 };
      e.lastMessage = m;
      if (m.receiverId === userId && !m.seen) e.unseen++;
      out[other] = e;
    }
    return out;
  }
}
