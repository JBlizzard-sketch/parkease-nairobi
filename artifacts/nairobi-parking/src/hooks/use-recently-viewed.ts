import { useState } from "react";

const STORAGE_KEY = "parkease_recently_viewed";
const MAX_ITEMS = 10;

function loadRecent(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useRecentlyViewed() {
  const [recentIds, setRecentIds] = useState<number[]>(() => loadRecent());

  const addToRecent = (id: number) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const clearRecent = () => {
    setRecentIds([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return { recentIds, addToRecent, clearRecent };
}
