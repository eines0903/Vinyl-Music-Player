export interface LyricSearchResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  syncedLyrics?: string;
  plainLyrics?: string;
  isSynced: boolean;
}

/**
 * 清理歌名與歌手字串中的多餘標籤，大幅提高線上檢索命中率
 */
export const cleanSongQuery = (
  rawTitle: string,
  rawArtist?: string
): { cleanTitle: string; cleanArtist: string } => {
  let title = rawTitle || '';
  let artist = rawArtist || '';

  // 1. 如果歌名包含 "歌手 - 歌名"
  const dashMatch = title.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    if (!artist || artist === '未知歌手' || artist === 'YouTube') {
      artist = dashMatch[1].trim();
    }
    title = dashMatch[2].trim();
  }

  // 2. 清理括號中的 MV、官方視頻、音質字樣
  title = title
    .replace(/\s*[([（【].*?(MV|Official|Audio|Video|Lyrics|Lyric|Full|1080[pP]|4[kK]|Live|HD|HQ).*?[)\]）】]/gi, '')
    .replace(/[-_]?(128[kK]|320[kK]|flac|mp3)/gi, '')
    .replace(/['"「」『』]/g, '')
    .trim();

  if (artist === '未知歌手' || artist === 'YouTube') {
    artist = '';
  }

  return { cleanTitle: title, cleanArtist: artist.trim() };
};

/**
 * 線上即時搜尋歌詞（支援模糊搜尋與候選清單）
 */
export const searchOnlineLyrics = async (
  title: string,
  artist?: string
): Promise<LyricSearchResult[]> => {
  const { cleanTitle, cleanArtist } = cleanSongQuery(title, artist);
  if (!cleanTitle) return [];

  const queryCandidates = [
    `${cleanTitle} ${cleanArtist}`.trim(),
    cleanTitle,
  ];

  for (const q of queryCandidates) {
    try {
      const url = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'VinylMusicPlayer/1.0',
        },
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          trackName: item.trackName || item.name || cleanTitle,
          artistName: item.artistName || '未知歌手',
          albumName: item.albumName || '',
          duration: item.duration || 0,
          syncedLyrics: item.syncedLyrics || '',
          plainLyrics: item.plainLyrics || '',
          isSynced: Boolean(item.syncedLyrics && item.syncedLyrics.trim().length > 0),
        }));
      }
    } catch (err) {
      console.warn('檢索歌詞發生異常:', err);
    }
  }

  return [];
};

/**
 * 自動搜尋並擷取最佳匹配歌詞（優先取得帶時間軸的 syncedLyrics）
 */
export const autoFetchBestLyric = async (
  title: string,
  artist?: string
): Promise<string> => {
  try {
    const list = await searchOnlineLyrics(title, artist);
    if (list.length === 0) return '';

    // 優先挑選具有同步時間軸者
    const syncedMatch = list.find((item) => item.isSynced && item.syncedLyrics);
    if (syncedMatch && syncedMatch.syncedLyrics) {
      return syncedMatch.syncedLyrics;
    }

    // 次之挑選純文字歌詞
    const plainMatch = list.find((item) => item.plainLyrics);
    if (plainMatch && plainMatch.plainLyrics) {
      return plainMatch.plainLyrics;
    }

    return '';
  } catch {
    return '';
  }
};
