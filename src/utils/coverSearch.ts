export interface SearchCoverResult {
  artworkUrl: string;
  title: string;
  artist: string;
  source: 'iTunes' | 'YouTube';
}

/**
 * 清洗歌名，移除 MV、128k、括號等雜訊以利搜尋
 */
export const cleanSearchTitle = (rawTitle: string): string => {
  return rawTitle
    .replace(/[\[\(]?(?:official\s*)?(?:mv|video|audio|music\s*video|hd|4k)[\]\)]?/gi, '')
    .replace(/_\d+k(?:bps)?/gi, '')
    .replace(/\.mp3$/i, '')
    .replace(/[\[\(][^\]\)]*[\]\)]/g, ' ')
    .replace(/['"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * 從 YouTube 網址提取 Video ID
 */
export const extractYouTubeId = (url: string): string | null => {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? match[1] : null;
};

/**
 * 取得 YouTube 預設縮圖網址
 */
export const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

/**
 * 線上搜尋官方高畫質封面 (iTunes Search API)
 */
export const searchOnlineCovers = async (title: string, artist = ''): Promise<SearchCoverResult[]> => {
  const cleanTerm = cleanSearchTitle(`${artist} ${title}`);
  if (!cleanTerm) return [];

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanTerm)}&entity=song&limit=6`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.results || data.results.length === 0) return [];

    return data.results.map((item: any) => ({
      // 將 100x100 替換為 1000x1000 取得超高畫質封面
      artworkUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb.jpg', '1000x1000bb.jpg') : '',
      title: item.trackName || '',
      artist: item.artistName || '',
      source: 'iTunes',
    }));
  } catch (err) {
    console.warn('線上搜尋封面失敗:', err);
    return [];
  }
};
