"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

export default function AuthNav() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setEmail(u?.email || null));
    return () => unsub();
  }, []);

  if (!email) {
    return null; // Hidden until signed in
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/admin" className="pill px-3 py-2 text-sm hover:bg-white/10">Admin</Link>
    </div>
  );
}
