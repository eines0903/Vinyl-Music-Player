import React, { useState } from 'react';
import { extractYouTubeId, getYouTubeThumbnail } from '../utils/coverSearch';
import { autoFetchBestLyric } from '../utils/lyricSearch';
import type { SongItem } from '../types/song';

interface YouTubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSong: (song: SongItem) => void;
}

export const YouTubeModal: React.FC<YouTubeModalProps> = ({
  isOpen,
  onClose,
  onAddSong,
}) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFetchInfo = async () => {
    setErrorMsg('');
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      setErrorMsg('請輸入有效的 YouTube 影片或 MV 網址');
      return;
    }

    setIsLoading(true);
    try {
      // 透過 noembed 免費且無 CORS 限制獲取 YouTube 影片標題與作者
      const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      const data = await res.json();
      if (data.title) {
        setTitle(data.title);
        setArtist(data.author_name || 'YouTube');
      } else {
        setTitle(`YouTube 音訊 (${videoId})`);
        setArtist('YouTube');
      }
    } catch {
      setTitle(`YouTube 音訊 (${videoId})`);
      setArtist('YouTube');
    }
    setIsLoading(false);
  };

  const handleAdd = async () => {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      setErrorMsg('請輸入有效的 YouTube 網址');
      return;
    }

    const songTitle = title || `YouTube MV (${videoId})`;
    const songArtist = artist || 'YouTube';

    // 背景搜尋歌詞，即使無歌詞亦可正常新增
    let lrc = '';
    try {
      lrc = await autoFetchBestLyric(songTitle, songArtist !== 'YouTube' ? songArtist : '');
    } catch {
      // ignore
    }

    const newSong: SongItem = {
      id: `yt-${videoId}-${Date.now()}`,
      title: songTitle,
      artist: songArtist,
      audioUrl: `https://www.youtube.com/watch?v=${videoId}`,
      coverUrl: getYouTubeThumbnail(videoId),
      lrcContent: lrc,
    };

    onAddSong(newSong);
    setUrl('');
    setTitle('');
    setArtist('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md p-6 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl text-white space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-lg">▶</span>
            <h3 className="text-lg font-bold">連接 YouTube MV / 音樂</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">貼上 YouTube 影片網址：</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={handleFetchInfo}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 px-3 py-2 text-sm bg-zinc-800/80 border border-zinc-700 rounded-xl focus:outline-none focus:border-red-500 text-white placeholder-zinc-500"
              />
              <button
                onClick={handleFetchInfo}
                disabled={isLoading || !url.trim()}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs rounded-xl border border-zinc-700 transition"
              >
                {isLoading ? '載入中...' : '擷取資訊'}
              </button>
            </div>
            {errorMsg && <p className="text-xs text-rose-400 mt-1">{errorMsg}</p>}
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">歌名 / MV 名稱：</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="自動載入或自訂名稱..."
              className="w-full px-3 py-2 text-sm bg-zinc-800/80 border border-zinc-700 rounded-xl focus:outline-none focus:border-red-500 text-white placeholder-zinc-500"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">歌手 / 頻道名稱：</label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="歌手名稱..."
              className="w-full px-3 py-2 text-sm bg-zinc-800/80 border border-zinc-700 rounded-xl focus:outline-none focus:border-red-500 text-white placeholder-zinc-500"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-zinc-400 hover:text-white rounded-xl transition"
          >
            取消
          </button>
          <button
            onClick={handleAdd}
            disabled={!url.trim()}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg transition"
          >
            加入播放清單
          </button>
        </div>
      </div>
    </div>
  );
};
