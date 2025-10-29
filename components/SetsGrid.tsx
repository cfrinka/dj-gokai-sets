"use client";

import { useEffect, useMemo, useState } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";

type DjSet = {
  id: string;
  title: string;
  imageUrl?: string;
  description?: string;
  duration?: string;
  audioPath?: string; // path in storage, e.g., "sets/midnight-frequencies.mp3"
};

export default function SetsGrid() {
  const [sets, setSets] = useState<DjSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, "sets"), orderBy("order", "asc"));
        const snap = await getDocs(q);
        const data: DjSet[] = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
        setSets(data);

        // Prefetch audio download URLs when available
        const urlEntries: [string, string][] = [];
        for (const s of data) {
          if (s.audioPath) {
            try {
              const u = await getDownloadURL(ref(storage, s.audioPath));
              urlEntries.push([s.id, u]);
            } catch { }
          }
        }
        setAudioUrls(Object.fromEntries(urlEntries));
      } catch (e: any) {
        setError(e?.message || "Failed to load sets");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="text-white/70">Carregando sets…</div>
    );
  }
  if (error) {
    return <div className="text-red-400">{error}</div>;
  }
  if (!sets.length) {
    return <div className="text-white/70">Nenhum set publicado ainda.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {sets.map((s) => (
        <article key={s.id} className="card overflow-hidden hover:translate-y-[-2px] transition-transform">
          <img src={s.imageUrl || "/window.svg"} alt={s.title} className="w-full h-48 object-cover" />
          <div className="p-5">
            <div className="flex items-center justify-end mb-2">
              <span className="text-xs text-white/60">{s.duration || "--"}</span>
            </div>
            <h3 className="text-lg font-semibold">{s.title}</h3>
            {s.description && (
              <p className="text-white/70 text-sm mt-1 line-clamp-2">{s.description}</p>
            )}
            <div className="mt-4 flex gap-3 items-center">
              {audioUrls[s.id] ? (
                <>
                  <button
                    onClick={() => setPlayingId(playingId === s.id ? null : s.id)}
                    className="pill px-3 py-2 text-xs"
                  >
                    {playingId === s.id ? "Pause" : "Play"}
                  </button>
                  <a href={audioUrls[s.id]} target="_blank" className="pill px-3 py-2 text-xs" rel="noreferrer">
                    Download
                  </a>
                </>
              ) : (
                <span className="text-xs text-white/50">Nenhum arquivo de audio</span>
              )}
            </div>
            {playingId === s.id && audioUrls[s.id] && (
              <audio className="mt-4 w-full" src={audioUrls[s.id]} autoPlay controls />
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
