"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { useToast } from "@/components/ToastRoot";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { collection, addDoc, deleteDoc, doc, getDocs, orderBy, query } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

function useAuth() {
  const [user, setUser] = useState<null | { uid: string; displayName?: string | null; email?: string | null }>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ? { uid: u.uid, displayName: u.displayName, email: u.email } : null);
      setLoading(false);
    });
    return () => unsub();
  }, []);
  return { user, loading };
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ title: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ audio?: number; image?: number }>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [sets, setSets] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const provider = useMemo(() => new GoogleAuthProvider(), []);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      const q = query(collection(db, "sets"), orderBy("order", "asc"));
      const snap = await getDocs(q);
      setSets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    };
    load();
  }, [refreshKey]);

  const allowedEmails = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
    return raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }, []);

  const handleLogin = async () => {
    await signInWithPopup(auth, provider);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Select an audio file");
    setBusy(true);
    setStartedAt(Date.now());
    try {
      const path = `sets/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file, {
          customMetadata: { title: form.title || file.name },
        });
        task.on(
          "state_changed",
          (snap) => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setProgress((p) => ({ ...p, audio: pct }));
          },
          (err) => reject(err),
          () => resolve()
        );
      });

      // Determine duration from local file metadata
      const durationText = await new Promise<string>((resolve) => {
        try {
          const audio = new Audio();
          audio.preload = "metadata";
          audio.src = URL.createObjectURL(file);
          audio.onloadedmetadata = () => {
            const d = Math.max(0, audio.duration || 0);
            const mins = Math.floor(d / 60);
            const secs = Math.floor(d % 60).toString().padStart(2, "0");
            resolve(`${mins}:${secs}`);
          };
          audio.onerror = () => resolve("--");
        } catch {
          resolve("--");
        }
      });

      let imageUrl = "";
      if (imageFile) {
        const imgPath = `sets/images/${Date.now()}-${imageFile.name}`;
        const imgRef = ref(storage, imgPath);
        await new Promise<void>((resolve, reject) => {
          const task = uploadBytesResumable(imgRef, imageFile);
          task.on(
            "state_changed",
            (snap) => {
              const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
              setProgress((p) => ({ ...p, image: pct }));
            },
            (err) => reject(err),
            async () => {
              imageUrl = await getDownloadURL(imgRef);
              resolve();
            }
          );
        });
      }
      // We store path, not public URL; frontend resolves to signed URL when needed
      await addDoc(collection(db, "sets"), {
        title: form.title || file.name,
        description: form.description || "",
        duration: durationText || "--",
        order: sets.length + 1,
        imageUrl,
        audioPath: path,
        createdAt: Date.now(),
      });
      setForm({ title: "", description: "" });
      setFile(null);
      setImageFile(null);
      setProgress({});
      if (audioInputRef.current) audioInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
      setRefreshKey((x) => x + 1);
      toast.success("Set uploaded successfully");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string, audioPath?: string) => {
    if (!confirm("Delete this set? This also removes the audio file.")) return;
    try {
      await deleteDoc(doc(db, "sets", id));
      if (audioPath) {
        await deleteObject(ref(storage, audioPath));
      }
      setRefreshKey((x) => x + 1);
      toast.success("Set deleted");
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    }
  };

  if (loading) return <div className="container mx-auto px-6 py-16">Loading…</div>;

  if (!user)
    return (
      <div className="container mx-auto px-6 py-16 flex flex-col items-center gap-6">
        <h1 className="text-2xl font-semibold">Admin Login</h1>
        <button onClick={handleLogin} className="btn-primary pill px-6 py-3 glow">Sign in with Google</button>
      </div>
    );

  if (allowedEmails.length && !allowedEmails.includes((user.email || "").toLowerCase())) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-3">Not authorized</h1>
        <p className="text-white/70 mb-6">Your account does not have access to this page.</p>
        <button onClick={handleLogout} className="pill px-4 py-2">Sign out</button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Manage Sets</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white/70">{user.email}</span>
          <button onClick={handleLogout} className="pill px-3 py-2">Sign out</button>
        </div>
      </div>

      <form onSubmit={handleUpload} className="card p-6 mb-10 grid gap-4">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="grid gap-2 text-sm">
            <span>Title</span>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="pill px-3 py-2 bg-transparent text-white/90" placeholder="Midnight Frequencies" />
          </label>
          <label className="grid gap-2 text-sm md:col-span-2">
            <span>Description</span>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="description px-3 py-2 bg-transparent text-white/90 min-h-24" placeholder="Short description of the set" />
          </label>
          <label className="grid gap-2 text-sm md:col-span-2">
            <span>Audio File (mp3/wav)</span>
            <input ref={audioInputRef} type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-white/80" />
          </label>
          <label className="grid gap-2 text-sm md:col-span-2">
            <span>Or Upload Cover Image (optional)</span>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="text-white/80" />
          </label>
        </div>
        <div>
          <button disabled={busy} className="btn-primary pill px-6 py-3 glow disabled:opacity-60" type="submit">
            {busy ? "Uploading…" : "Upload Set"}
          </button>
          {(progress.audio || progress.image) && (
            <div className="mt-4 grid gap-3">
              {typeof progress.audio === "number" && (
                <ProgressWithEta label="Audio" pct={progress.audio} startedAt={startedAt} />
              )}
              {typeof progress.image === "number" && (
                <ProgressWithEta label="Image" pct={progress.image} startedAt={startedAt} />
              )}
            </div>
          )}
        </div>
      </form>

      {/* Drag-and-drop ordering */}
      <ReorderList sets={sets} onDelete={handleDelete} onReorder={setSets} />
    </div>
  );
}

function ProgressWithEta({ label, pct, startedAt }: { label: string; pct: number; startedAt: number | null }) {
  let eta = "--";
  if (startedAt && pct > 0 && pct < 100) {
    const elapsed = (Date.now() - startedAt) / 1000; // seconds
    const rate = pct / elapsed; // pct per second
    const remainingSec = (100 - pct) / rate;
    const m = Math.floor(remainingSec / 60);
    const s = Math.max(0, Math.round(remainingSec % 60));
    eta = `${m}:${s.toString().padStart(2, "0")}`;
  } else if (pct >= 100) {
    eta = "done";
  }
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-white/70 mb-1">
        <span>{label}</span>
        <span>{pct}% {eta !== "--" ? `• ETA ${eta}` : ""}</span>
      </div>
      <div className="progress">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ReorderList({ sets, onDelete, onReorder }: { sets: any[]; onDelete: (id: string, audioPath?: string) => Promise<void> | void; onReorder: (s: any[]) => void }) {
  const [saving, setSaving] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, index: number) => {
    e.dataTransfer.setData("text/plain", String(index));
    setDraggingIndex(index);
  };
  const handleDragEnd = () => {
    setDraggingIndex(null);
    setOverIndex(null);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    const from = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isNaN(from)) return;
    const newArr = [...sets];
    const [moved] = newArr.splice(from, 1);
    newArr.splice(index, 0, moved);
    onReorder(newArr);
    setOverIndex(null);
  };
  const allowDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    setOverIndex(index);
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const { writeBatch, doc, getFirestore } = await import("firebase/firestore");
      const batch = writeBatch(getFirestore());
      sets.forEach((s: any, i: number) => {
        batch.update(doc(getFirestore(), "sets", s.id), { order: i + 1 });
      });
      await batch.commit();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Reorder Sets</h2>
        <button onClick={saveOrder} className="pill px-4 py-2 text-sm" disabled={saving}>{saving ? "Saving…" : "Save Order"}</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sets.map((s: any, i: number) => (
          <div key={s.id} onDragOver={(e) => allowDrop(e, i)} onDrop={(e) => handleDrop(e, i)} className={`card overflow-hidden transition-shadow ${overIndex === i ? "ring-2 ring-[var(--brand-accent)]" : ""} ${draggingIndex === i ? "opacity-70" : ""}`}>
            <img src={s.imageUrl || "/window.svg"} alt={s.title} className="w-full h-40 object-cover" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/60">{s.duration || "--"}</span>
                <span className="text-xs text-white/50">#{i + 1}</span>
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              {s.description && <p className="text-white/70 text-sm mt-1 line-clamp-2">{s.description}</p>}
              <div className="mt-4 flex items-center gap-3">
                <button
                  className="drag-handle pill px-3 py-2 text-xs"
                  draggable
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragEnd={handleDragEnd}
                  aria-label="Drag to reorder"
                  title="Drag to reorder"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 5h-2v2h2V5zm0 6H7v2h2v-2zm0 6H7v2h2v-2zM17 5h-2v2h2V5zm0 6h-2v2h2v-2zm0 6h-2v2h2v-2z" fill="currentColor" />
                  </svg>
                </button>
                <button onClick={() => onDelete(s.id, s.audioPath)} className="pill px-3 py-2 text-xs">Delete</button>
                {s.audioPath && (
                  <a className="pill px-3 py-2 text-xs" target="_blank" rel="noreferrer" href={"#"} onClick={async (e) => {
                    e.preventDefault();
                    const url = await getDownloadURL(ref(storage, s.audioPath));
                    window.open(url, "_blank");
                  }}>Open File</a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
