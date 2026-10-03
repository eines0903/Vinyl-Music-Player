import jsmediatags from 'jsmediatags';
import { searchOnlineCovers } from './coverSearch';
import { autoFetchBestLyric } from './lyricSearch';

export interface ExtractedMetadata {
  title: string;
  artist: string;
  coverUrl: string;
  lyrics: string;
}

/**
 * 智慧檔名解析：從檔名分離出歌手與歌名
 * 例如："WOODZ (조승연) - 파랗게 (Love Me Harder).mp3" -> 歌手: WOODZ (조승연), 歌名: 파랗게 (Love Me Harder)
 * 例如："CLOSE YOUR EYES '내 안의 모든 시와 소설은' MV_128k.mp3" -> 歌手: CLOSE YOUR EYES, 歌名: 내 안의 모든 시와 소설은
 */
export const parseArtistAndTitleFromFilename = (
  filename: string
): { artist: string; title: string } => {
  const baseName = filename.replace(/\.[^/.]+$/, '').trim();

  // 1. 匹配常見格式："歌手 - 歌名" 或 "歌手 – 歌名"
  const dashMatch = baseName.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    return {
      artist: dashMatch[1].trim(),
      title: dashMatch[2].trim(),
    };
  }

  // 2. 匹配常見格式："歌手 '歌名'" 或 "歌手「歌名」"
  const quoteMatch = baseName.match(/^(.+?)\s*['"「『](.+?)['"」』](.*)$/);
  if (quoteMatch) {
    return {
      artist: quoteMatch[1].trim(),
      title: quoteMatch[2].trim(),
    };
  }

  return {
    artist: '未知歌手',
    title: baseName,
  };
};

export const extractMetadataFromMP3 = (file: File): Promise<ExtractedMetadata> => {
  return new Promise((resolve) => {
    jsmediatags.read(file, {
      onSuccess: async (tag) => {
        const { tags } = tag;
        const parsedName = parseArtistAndTitleFromFilename(file.name);

        let title = tags.title || parsedName.title;
        let artist = tags.artist || parsedName.artist;
        let coverUrl = '';

        if (tags.picture) {
          const { data, format } = tags.picture;
          const byteArray = new Uint8Array(data);
          const blob = new Blob([byteArray], { type: format });
          coverUrl = URL.createObjectURL(blob);
        }

        let lyrics = '';
        if (tags.lyrics && typeof tags.lyrics === 'object') {
          lyrics = (tags.lyrics as Record<string, string>).lyrics || '';
        } else if (tags.USLT && (tags.USLT as Record<string, any>).data) {
          lyrics = (tags.USLT as Record<string, any>).data.lyrics || '';
        }

        // 若無內嵌封面或無歌手，自動聯網檢索 iTunes/Apple Music 官方超高畫質專輯與歌手資訊
        if (!coverUrl || artist === '未知歌手') {
          try {
            const onlineResults = await searchOnlineCovers(
              title,
              artist !== '未知歌手' ? artist : ''
            );
            if (onlineResults.length > 0) {
              const bestMatch = onlineResults[0];
              if (!coverUrl && bestMatch.artworkUrl) {
                coverUrl = bestMatch.artworkUrl;
              }
              if (artist === '未知歌手' && bestMatch.artist) {
                artist = bestMatch.artist;
              }
            }
          } catch (e) {
            console.warn('線上自動檢索封面失敗:', e);
          }
        }

        // 若無內建歌詞，自動聯網檢索同步時間軸歌詞（LRCLIB）
        if (!lyrics) {
          try {
            lyrics = await autoFetchBestLyric(title, artist !== '未知歌手' ? artist : '');
          } catch (e) {
            console.warn('線上自動檢索歌詞失敗:', e);
          }
        }

        if (!coverUrl) {
          coverUrl =
            'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80';
        }

        resolve({ title, artist, coverUrl, lyrics });
      },
      onError: async () => {
        const parsedName = parseArtistAndTitleFromFilename(file.name);
        let title = parsedName.title;
        let artist = parsedName.artist;
        let coverUrl =
          'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80';
        let lyrics = '';

        // 即使 ID3 標籤完全損壞，依然嘗試從檔名聯網補齊封面與歌手
        try {
          const onlineResults = await searchOnlineCovers(
            title,
            artist !== '未知歌手' ? artist : ''
          );
          if (onlineResults.length > 0) {
            const bestMatch = onlineResults[0];
            coverUrl = bestMatch.artworkUrl || coverUrl;
            if (artist === '未知歌手' && bestMatch.artist) {
              artist = bestMatch.artist;
            }
          }
        } catch {
          // ignore
        }

        try {
          lyrics = await autoFetchBestLyric(title, artist !== '未知歌手' ? artist : '');
        } catch {
          // ignore
        }

        resolve({
          title,
          artist,
          coverUrl,
          lyrics,
        });
      },
    });
  });
};
