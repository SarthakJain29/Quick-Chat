import type { AIService } from "./ai/index.js";
import type { MediaService } from "./services/media.js";
import type { Realtime } from "./services/realtime.js";
import type { Store } from "./store/Store.js";

/** Everything a route needs; injected so tests can swap in fakes. */
export interface AppContext {
  store: Store;
  ai: AIService;
  media: MediaService;
  realtime: Realtime;
  /** Called after a human sends a message to `receiverId`; used for bot auto-replies. */
  onMessage?: (senderId: string, receiverId: string) => void;
  jwtSecret?: string;
}
