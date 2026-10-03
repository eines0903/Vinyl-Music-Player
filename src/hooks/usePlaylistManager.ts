import { useState, useMemo, useCallback, useEffect } from 'react';
import type { SongItem, Playlist, SortOption } from '../types/song';
import { fisherYatesShuffle } from '../utils/shuffle';
import {
  loadAllPlaylistsFromDB,
  savePlaylistToDB,
  deletePlaylistFromDB,
  recordSongPlay,
} from '../utils/indexedDb';

export const usePlaylistManager = (initialSongs: SongItem[] = []) => {
  const [allSongs, setAllSongsState] = useState<SongItem[]>(initialSongs);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string>('all');
  const [currentSort, setCurrentSort] = useState<SortOption>('manual');
  const [currentSongId, setCurrentSongId] = useState<string | null>(
    initialSongs[0]?.id || null
  );
  const [isShuffle, setIsShuffle] = useState<boolean>(false);

  // 初始化時從本機載入使用者建立的自訂播放清單
  useEffect(() => {
    loadAllPlaylistsFromDB()
      .then((savedLists) => {
        if (savedLists && savedLists.length > 0) {
          setPlaylists(savedLists);
        }
      })
      .catch((err) => console.warn('載入自訂播放清單失敗:', err));
  }, []);

  // 1. 根據當前啟用的清單 ID 篩選出基礎曲目
  const rawActiveSongs = useMemo<SongItem[]>(() => {
    if (activePlaylistId === 'all') {
      return allSongs;
    }
    if (activePlaylistId === 'monthly-favorites') {
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      // 篩選有播放次數且為近一個月內的歌曲，依熱門度排序
      return allSongs
        .filter(
          (s) =>
            (s.playCount || 0) > 0 &&
            (!s.lastPlayedAt || s.lastPlayedAt >= thirtyDaysAgo)
        )
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    }

    const targetList = playlists.find((p) => p.id === activePlaylistId);
    if (!targetList) return allSongs;
    const songMap = new Map(allSongs.map((s) => [s.id, s]));
    return targetList.songIds
      .map((id) => songMap.get(id))
      .filter((s): s is SongItem => Boolean(s));
  }, [allSongs, playlists, activePlaylistId]);

  // 2. 應用排序選項 (手動、新增日期、熱門度、發布日期)
  const sortedSongs = useMemo<SongItem[]>(() => {
    if (currentSort === 'manual') {
      return rawActiveSongs;
    }
    const list = [...rawActiveSongs];
    switch (currentSort) {
      case 'date-newest':
        return list.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
      case 'date-oldest':
        return list.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
      case 'popular':
        return list.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
      case 'release-newest':
        return list.sort((a, b) =>
          (b.releaseDate || '').localeCompare(a.releaseDate || '')
        );
      case 'release-oldest':
        return list.sort((a, b) =>
          (a.releaseDate || '').localeCompare(b.releaseDate || '')
        );
      default:
        return list;
    }
  }, [rawActiveSongs, currentSort]);

  // 3. 隨機播放洗牌佇列
  const currentQueue = useMemo<SongItem[]>(() => {
    if (!isShuffle || sortedSongs.length <= 1) {
      return sortedSongs;
    }
    const current = sortedSongs.find((s) => s.id === currentSongId);
    if (!current) {
      return fisherYatesShuffle(sortedSongs);
    }
    const others = sortedSongs.filter((s) => s.id !== current.id);
    return [current, ...fisherYatesShuffle(others)];
  }, [sortedSongs, isShuffle, currentSongId]);

  // 4. 當前播放曲目
  const currentSong = useMemo<SongItem | null>(() => {
    if (!currentQueue.length) return null;
    const found = currentQueue.find((s) => s.id === currentSongId);
    return found || currentQueue[0] || null;
  }, [currentQueue, currentSongId]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (currentQueue.length === 0) return;
    const currentIndex = currentQueue.findIndex((s) => s.id === currentSongId);
    const nextIndex =
      currentIndex === -1 ? 0 : (currentIndex + 1) % currentQueue.length;
    setCurrentSongId(currentQueue[nextIndex].id);
  }, [currentQueue, currentSongId]);

  const handlePrev = useCallback(() => {
    if (currentQueue.length === 0) return;
    const currentIndex = currentQueue.findIndex((s) => s.id === currentSongId);
    const prevIndex =
      currentIndex === -1
        ? 0
        : (currentIndex - 1 + currentQueue.length) % currentQueue.length;
    setCurrentSongId(currentQueue[prevIndex].id);
  }, [currentQueue, currentSongId]);

  const selectSongById = useCallback((songId: string) => {
    setCurrentSongId(songId);
  }, []);

  const addSongs = useCallback((newSongs: SongItem[]) => {
    if (!newSongs.length) return;
    const stamped = newSongs.map((s) => ({
      ...s,
      addedAt: s.addedAt || Date.now(),
      playCount: s.playCount || 0,
    }));
    setAllSongsState((prev) => [...prev, ...stamped]);
    setCurrentSongId((prevId) => prevId || stamped[0].id);
  }, []);

  const removeSong = useCallback((songId: string) => {
    setAllSongsState((prev) => prev.filter((s) => s.id !== songId));
    // 同步從所有自訂清單移除
    setPlaylists((prev) =>
      prev.map((pl) => ({
        ...pl,
        songIds: pl.songIds.filter((id) => id !== songId),
      }))
    );
  }, []);

  const updateSong = useCallback(
    (songId: string, updates: Partial<SongItem>) => {
      setAllSongsState((prev) =>
        prev.map((s) => (s.id === songId ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const updateSongCover = useCallback(
    (songId: string, newCoverUrl: string) => {
      updateSong(songId, { coverUrl: newCoverUrl });
    },
    [updateSong]
  );

  const setAllSongs = useCallback((songs: SongItem[]) => {
    const stamped = songs.map((s) => ({
      ...s,
      addedAt: s.addedAt || Date.now(),
      playCount: s.playCount || 0,
    }));
    setAllSongsState(stamped);
    setCurrentSongId((prevId) => {
      if (prevId && stamped.some((s) => s.id === prevId)) {
        return prevId;
      }
      return stamped.length > 0 ? stamped[0].id : null;
    });
  }, []);

  const clearAll = useCallback(() => {
    setAllSongsState([]);
    setCurrentSongId(null);
  }, []);

  // 5. 聆聽計數：更新次數與最後播放時間
  const recordPlay = useCallback((songId: string) => {
    setAllSongsState((prev) =>
      prev.map((s) => {
        if (s.id === songId) {
          return {
            ...s,
            playCount: (s.playCount || 0) + 1,
            lastPlayedAt: Date.now(),
          };
        }
        return s;
      })
    );
    recordSongPlay(songId).catch((e) => console.warn('記錄播放次數失敗:', e));
  }, []);

  // 6. 自訂清單管理
  const createPlaylist = useCallback(async (name: string): Promise<Playlist> => {
    const newPlaylist: Playlist = {
      id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || '未命名播放清單',
      songIds: [],
      createdAt: Date.now(),
    };
    setPlaylists((prev) => [...prev, newPlaylist]);
    setActivePlaylistId(newPlaylist.id);
    await savePlaylistToDB(newPlaylist);
    return newPlaylist;
  }, []);

  const deletePlaylist = useCallback(
    async (playlistId: string) => {
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      if (activePlaylistId === playlistId) {
        setActivePlaylistId('all');
      }
      await deletePlaylistFromDB(playlistId);
    },
    [activePlaylistId]
  );

  const renamePlaylist = useCallback(
    async (playlistId: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      let target: Playlist | null = null;
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === playlistId) {
            target = { ...p, name: trimmed };
            return target;
          }
          return p;
        })
      );
      if (target) {
        await savePlaylistToDB(target);
      }
    },
    []
  );

  const addSongToPlaylist = useCallback(
    async (playlistId: string, songId: string) => {
      let target: Playlist | null = null;
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === playlistId && !p.songIds.includes(songId)) {
            target = { ...p, songIds: [...p.songIds, songId] };
            return target;
          }
          return p;
        })
      );
      if (target) {
        await savePlaylistToDB(target);
      }
    },
    []
  );

  const removeSongFromPlaylist = useCallback(
    async (playlistId: string, songId: string) => {
      let target: Playlist | null = null;
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === playlistId) {
            target = {
              ...p,
              songIds: p.songIds.filter((id) => id !== songId),
            };
            return target;
          }
          return p;
        })
      );
      if (target) {
        await savePlaylistToDB(target);
      }
    },
    []
  );

  return {
    allSongs,
    playlists,
    activePlaylistId,
    setActivePlaylistId,
    currentSort,
    setCurrentSort,
    currentSong,
    currentQueue,
    currentSongId: currentSong?.id || null,
    isShuffle,
    toggleShuffle,
    handleNext,
    handlePrev,
    selectSongById,
    addSongs,
    removeSong,
    updateSong,
    updateSongCover,
    setAllSongs,
    clearAll,
    recordPlay,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
  };
};
