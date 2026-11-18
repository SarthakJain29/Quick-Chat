import { useCallback, useEffect, useState } from "react";
import { ChatList } from "../components/ChatList";
import { ChatView, Lightbox } from "../components/ChatView";
import { InfoPanel } from "../components/InfoPanel";
import { useChat } from "../store/chat";

export function HomePage() {
  const { selectedId, loadChats } = useChat();
  const [image, setImage] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const closeImage = useCallback(() => setImage(null), []);

  useEffect(() => { void loadChats(); }, [loadChats]);

  return (
    <div className="mx-auto h-full max-w-[1500px] p-0 md:p-5">
      <div className="glass grid h-full overflow-hidden bg-[#0b0914]/60 md:rounded-[2rem] md:grid-cols-[320px_1fr] xl:grid-cols-[340px_1fr_320px]">
        <div className={`min-h-0 border-white/8 md:border-r ${selectedId ? "max-md:hidden" : ""}`}><ChatList /></div>
        <div className={`min-h-0 ${selectedId ? "" : "max-md:hidden"}`}><ChatView onOpenImage={setImage} onToggleInfo={() => setInfoOpen((o) => !o)} /></div>
        {selectedId && <div className="hidden min-h-0 border-l border-white/8 xl:block"><InfoPanel onOpenImage={setImage} /></div>}
      </div>

      {/* Info drawer for screens too narrow for the third column */}
      {selectedId && infoOpen && (
        <div className="fixed inset-0 z-40 xl:hidden" onClick={() => setInfoOpen(false)}>
          <div className="absolute inset-y-0 right-0 w-[min(340px,92vw)] animate-rise border-l border-white/10 bg-[#0e0c18]" onClick={(e) => e.stopPropagation()}><InfoPanel onOpenImage={(s) => { setInfoOpen(false); setImage(s); }} /></div>
        </div>
      )}
      <Lightbox src={image} onClose={closeImage} />
    </div>
  );
}
