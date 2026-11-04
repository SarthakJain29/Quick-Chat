import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { errorMessage } from "../lib/api";
import { readImage } from "../lib/format";
import { useAuth } from "../store/auth";

export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(user?.fullName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [pic, setPic] = useState<string>("");
  const [saving, setSaving] = useState(false);
  if (!user) return null;

  const pick = async (file?: File) => {
    if (!file) return;
    try { setPic(await readImage(file)); } catch (e) { toast.error(errorMessage(e)); }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await updateProfile({ fullName: name, bio, profilePic: pic || undefined });
    setSaving(false);
    if (ok) nav("/");
  };

  return (
    <main className="mx-auto grid min-h-full max-w-xl place-items-center px-5 py-10">
      <form onSubmit={save} className="glass w-full animate-rise rounded-[2rem] p-8">
        <Link to="/" className="btn btn-ghost -ml-3 mb-4"><ArrowLeft size={16} /> Back to chats</Link>
        <h1 className="font-display text-3xl font-extrabold">Your profile</h1>
        <label className="group relative mx-auto my-7 block w-28 cursor-pointer">
          <Avatar user={{ ...user, profilePic: pic || user.profilePic }} size={112} />
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/50 opacity-0 transition group-hover:opacity-100"><Camera /></span>
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => void pick(e.target.files?.[0])} />
          <span className="sr-only">Change profile photo</span>
        </label>
        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-white/40">Name<input className="field mt-1.5 normal-case tracking-normal" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} /></label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-white/40">Bio<textarea className="field mt-1.5 resize-none normal-case tracking-normal" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} /></label>
          <p className="text-xs text-white/35">{user.email}</p>
        </div>
        <button disabled={saving} className="btn btn-primary mt-7 w-full">{saving ? <Loader2 className="animate-spin" size={18} /> : "Save changes"}</button>
      </form>
    </main>
  );
}
