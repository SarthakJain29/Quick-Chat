import { avatarGradient, initials } from "../lib/format";
import type { User } from "../lib/types";

interface Props {
  user: Pick<User, "id" | "fullName" | "profilePic" | "isBot">;
  size?: number;
  online?: boolean;
}

export function Avatar({ user, size = 44, online }: Props) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {user.profilePic ? (
        <img src={user.profilePic} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span
          className="grid h-full w-full place-items-center rounded-full font-display font-bold text-white/95"
          style={{ background: avatarGradient(user.id), fontSize: size * 0.38 }}
        >
          {user.isBot && user.fullName === "Quick AI" ? "✦" : initials(user.fullName)}
        </span>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-[#12101e] ${online ? "bg-lime" : "bg-white/25"}`}
          style={{ width: size * 0.28, height: size * 0.28 }}
          title={online ? "Online" : "Offline"}
        />
      )}
    </span>
  );
}
