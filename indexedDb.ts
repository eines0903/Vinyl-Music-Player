import type { SongItem, Playlist } from '../types/song';
import type { FeedbackItem } from '../types/feedback';

const DB_NAME = 'VinylMusicPlayerDB';
const DB_VERSION = 3;
const STORE_NAME = 'songs';
const PLAYLISTS_STORE = 'playlists';
const FEEDBACK_STORE = 'feedback';

interface StoredSongRecord {
  id: string;
  title: string;
  artist: string;
  audioBlob?: Blob;
  audioUrl?: string;
  coverUrl: string;
  lrcContent: string;
  youtubeId?: string;
  addedAt: number;
  playCount?: number;
  lastPlayedAt?: number;
  releaseDate?: string;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
        db.createObjectStore(PLAYLISTS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FEEDBACK_STORE)) {
        db.createObjectStore(FEEDBACK_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveSongToDB = async (song: SongItem, file?: File | Blob): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: StoredSongRecord = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      audioBlob: file,
      audioUrl: song.audioUrl,
      coverUrl: song.coverUrl,
      lrcContent: song.lrcContent,
      addedAt: song.addedAt || Date.now(),
      playCount: song.playCount || 0,
      lastPlayedAt: song.lastPlayedAt,
      releaseDate: song.releaseDate,
    };

    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const updateSongInDB = async (id: string, updates: Partial<StoredSongRecord>): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      if (getReq.result) {
        const updated = { ...getReq.result, ...updates };
        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
};

export const recordSongPlay = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      if (getReq.result) {
        const currentCount = getReq.result.playCount || 0;
        const updated: StoredSongRecord = {
          ...getReq.result,
          playCount: currentCount + 1,
          lastPlayedAt: Date.now(),
        };
        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
};

export const deleteSongFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const loadAllSongsFromDB = async (): Promise<SongItem[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const records = req.result as StoredSongRecord[];
      const songs: SongItem[] = records
        .map((r) => {
          let audioUrl = r.audioUrl || '';
          if (r.audioBlob) {
            audioUrl = URL.createObjectURL(r.audioBlob);
          }
          // 自動從 legacy id 還原遺失的 YouTube 連結
          if (!audioUrl) {
            const ytMatch = r.id.match(/^yt-([a-zA-Z0-9_-]{11})/);
            if (ytMatch) {
              audioUrl = `https://www.youtube.com/watch?v=${ytMatch[1]}`;
            }
          }
          return {
            id: r.id,
            title: r.title,
            artist: r.artist,
            audioUrl,
            coverUrl: r.coverUrl,
            lrcContent: r.lrcContent,
            addedAt: r.addedAt || Date.now(),
            playCount: r.playCount || 0,
            lastPlayedAt: r.lastPlayedAt,
            releaseDate: r.releaseDate,
          };
        })
        .filter((s) => Boolean(s.audioUrl));

      resolve(songs);
    };

    req.onerror = () => reject(req.error);
  });
};

// ======================== 自訂播放清單儲存 ========================

export const savePlaylistToDB = async (playlist: Playlist): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PLAYLISTS_STORE, 'readwrite');
    const store = tx.objectStore(PLAYLISTS_STORE);
    const req = store.put(playlist);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const loadAllPlaylistsFromDB = async (): Promise<Playlist[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PLAYLISTS_STORE, 'readonly');
    const store = tx.objectStore(PLAYLISTS_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as Playlist[]);
    req.onerror = () => reject(req.error);
  });
};

export const deletePlaylistFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PLAYLISTS_STORE, 'readwrite');
    const store = tx.objectStore(PLAYLISTS_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// ======================== 用戶回饋問題儲存與管理 ========================

export const saveFeedbackToDB = async (feedback: FeedbackItem): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FEEDBACK_STORE, 'readwrite');
    const store = tx.objectStore(FEEDBACK_STORE);
    const req = store.put(feedback);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const loadAllFeedbackFromDB = async (): Promise<FeedbackItem[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FEEDBACK_STORE, 'readonly');
    const store = tx.objectStore(FEEDBACK_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result as FeedbackItem[]) || [];
      // 依提交時間倒序排列 (最新的在最前)
      items.sort((a, b) => b.createdAt - a.createdAt);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
};

export const deleteFeedbackFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FEEDBACK_STORE, 'readwrite');
    const store = tx.objectStore(FEEDBACK_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const clearAllFeedbackFromDB = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FEEDBACK_STORE, 'readwrite');
    const store = tx.objectStore(FEEDBACK_STORE);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

