"use client";

import { useEffect, useRef, useState } from "react";
import { db, storage } from "@/lib/firebase";
import { useToast } from "@/components/ToastRoot";
import { collection, addDoc, deleteDoc, doc, getDocs, orderBy, query } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check if user is already authenticated in session storage
    const authStatus = sessionStorage.getItem('admin_authenticated');
    setIsAuthenticated(authStatus === 'true');
    setLoading(false);
  }, []);
  
  return { isAuthenticated, setIsAuthenticated, loading };
}

export default function AdminPage() {
  const { isAuthenticated, setIsAuthenticated, loading } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [form, setForm] = useState({ title: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ audio?: number; image?: number }>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [sets, setSets] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingSet, setEditingSet] = useState<any | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const editAudioInputRef = useRef<HTMLInputElement | null>(null);
  const editImageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      const q = query(collection(db, "sets"), orderBy("order", "asc"));
      const snap = await getDocs(q);
      setSets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    };
    load();
  }, [refreshKey]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    
    if (password === adminPassword) {
      sessionStorage.setItem('admin_authenticated', 'true');
      setIsAuthenticated(true);
      setPassword("");
    } else {
      toast.error("Incorrect password");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    setIsAuthenticated(false);
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

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSet) return;
    setBusy(true);
    setStartedAt(Date.now());
    try {
      const updates: any = {
        title: editingSet.title,
        description: editingSet.description,
      };

      // Upload new audio file if provided
      if (file) {
        // Delete old audio file
        if (editingSet.audioPath) {
          try {
            await deleteObject(ref(storage, editingSet.audioPath));
          } catch (err) {
            console.warn("Could not delete old audio file:", err);
          }
        }

        const path = `sets/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, path);
        await new Promise<void>((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, file);
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

        // Get duration from new file
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
            audio.onerror = () => resolve(editingSet.duration || "--");
          } catch {
            resolve(editingSet.duration || "--");
          }
        });

        updates.audioPath = path;
        updates.duration = durationText;
      }

      // Upload new image file if provided
      if (imageFile) {
        const imgPath = `sets/images/${Date.now()}-${imageFile.name}`;
        const imgRef = ref(storage, imgPath);
        let imageUrl = "";
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
        updates.imageUrl = imageUrl;
      }

      await import("firebase/firestore").then(({ updateDoc, doc }) => 
        updateDoc(doc(db, "sets", editingSet.id), updates)
      );

      setFile(null);
      setImageFile(null);
      setProgress({});
      setEditingSet(null);
      if (editAudioInputRef.current) editAudioInputRef.current.value = "";
      if (editImageInputRef.current) editImageInputRef.current.value = "";
      setRefreshKey((x) => x + 1);
      toast.success("Set updated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Update failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="container mx-auto px-6 py-16">Loading…</div>;

  if (!isAuthenticated)
    return (
      <div className="container mx-auto px-6 py-16 flex flex-col items-center gap-6">
        <h1 className="text-2xl font-semibold">Admin Login</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full max-w-sm">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            className="pill px-4 py-3 bg-white/10 text-white placeholder:text-white/50"
            autoFocus
          />
          <button type="submit" className="btn-primary pill px-6 py-3 glow">
            Login
          </button>
        </form>
      </div>
    );

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Manage Sets</h1>
        <div className="flex items-center gap-3 text-sm">
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

      {/* Edit Modal */}
      {editingSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setEditingSet(null)}>
          <div className="card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Edit Set</h2>
              <button onClick={() => setEditingSet(null)} className="pill px-3 py-2 text-sm">Close</button>
            </div>
            <form onSubmit={handleEdit} className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="grid gap-2 text-sm">
                  <span>Title</span>
                  <input 
                    value={editingSet.title} 
                    onChange={(e) => setEditingSet({ ...editingSet, title: e.target.value })} 
                    className="pill px-3 py-2 bg-white/10 text-white/90" 
                    required 
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span>Duration (auto-calculated if audio changed)</span>
                  <input 
                    value={editingSet.duration || ""} 
                    className="pill px-3 py-2 bg-white/10 text-white/50" 
                    disabled 
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm">
                <span>Description</span>
                <textarea 
                  value={editingSet.description} 
                  onChange={(e) => setEditingSet({ ...editingSet, description: e.target.value })} 
                  className="pill px-3 py-2 bg-white/10 text-white/90 min-h-[80px]" 
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Replace Audio File (optional)</span>
                <input 
                  ref={editAudioInputRef}
                  type="file" 
                  accept="audio/*" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)} 
                  className="pill px-3 py-2 bg-white/10 text-white/90 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:bg-white/20 file:text-white hover:file:bg-white/30" 
                />
                {editingSet.audioPath && <span className="text-xs text-white/50">Current: {editingSet.audioPath.split('/').pop()}</span>}
              </label>
              <label className="grid gap-2 text-sm">
                <span>Replace Cover Image (optional)</span>
                <input 
                  ref={editImageInputRef}
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)} 
                  className="pill px-3 py-2 bg-white/10 text-white/90 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:bg-white/20 file:text-white hover:file:bg-white/30" 
                />
                {editingSet.imageUrl && (
                  <img src={editingSet.imageUrl} alt="Current" className="w-32 h-32 object-cover rounded" />
                )}
              </label>
              {busy && (
                <div className="grid gap-3">
                  {progress.audio !== undefined && <ProgressWithEta label="Audio Upload" pct={progress.audio} startedAt={startedAt} />}
                  {progress.image !== undefined && <ProgressWithEta label="Image Upload" pct={progress.image} startedAt={startedAt} />}
                </div>
              )}
              <button type="submit" className="btn-primary pill px-6 py-3 glow" disabled={busy}>
                {busy ? "Updating…" : "Update Set"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Drag-and-drop ordering */}
      <ReorderList sets={sets} onDelete={handleDelete} onEdit={setEditingSet} onReorder={setSets} />
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

function ReorderList({ sets, onDelete, onEdit, onReorder }: { sets: any[]; onDelete: (id: string, audioPath?: string) => Promise<void> | void; onEdit: (set: any) => void; onReorder: (s: any[]) => void }) {
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
              <div className="mt-4 flex items-center gap-2 flex-wrap">
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
                <button onClick={() => onEdit(s)} className="pill px-3 py-2 text-xs hover:bg-white/20">Edit</button>
                <button onClick={() => onDelete(s.id, s.audioPath)} className="pill px-3 py-2 text-xs hover:bg-white/20">Delete</button>
                {s.audioPath && (
                  <button className="pill px-3 py-2 text-xs hover:bg-white/20" onClick={async (e) => {
                    e.preventDefault();
                    try {
                      const url = await getDownloadURL(ref(storage, s.audioPath));
                      // Create a temporary anchor element to trigger download
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = s.audioPath.split('/').pop() || 'audio.mp3';
                      link.target = '_blank';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    } catch (err: any) {
                      console.error('Download error:', err);
                      alert('Failed to download file. Please check Firebase Storage CORS settings.');
                    }
                  }}>Download</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
