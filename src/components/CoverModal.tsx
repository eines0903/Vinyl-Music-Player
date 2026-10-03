import React, { useState, useEffect } from 'react';
import {
  searchOnlineCovers,
  cleanSearchTitle,
  extractYouTubeId,
  getYouTubeThumbnail,
  type SearchCoverResult,
} from '../utils/coverSearch';

interface CoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTitle: string;
  currentArtist: string;
  onSelectCover: (newCoverUrl: string, newArtist?: string, newTitle?: string) => void;
}

export const CoverModal: React.FC<CoverModalProps> = ({
  isOpen,
  onClose,
  currentTitle,
  currentArtist,
  onSelectCover,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchCoverResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      const defaultQuery = cleanSearchTitle(`${currentArtist} ${currentTitle}`);
      setQuery(defaultQuery);
      handleSearch(defaultQuery);
    }
  }, [isOpen, currentTitle, currentArtist]);

  if (!isOpen) return null;

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setIsLoading(true);
    const covers = await searchOnlineCovers(searchTerm);
    setResults(covers);
    setIsLoading(false);
  };

  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    onSelectCover(localUrl);
    onClose();
  };

  const handleApplyCustomUrl = () => {
    if (!customUrl.trim()) return;

    // 若輸入的是 YouTube 網址，自動轉換成 YouTube 高畫質封面
    const ytId = extractYouTubeId(customUrl);
    if (ytId) {
      const ytThumb = getYouTubeThumbnail(ytId);
      onSelectCover(ytThumb);
    } else {
      onSelectCover(customUrl.trim());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl p-6 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl text-white space-y-6">
        {/* 標題列 */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-lg font-bold">更換黑膠唱片封面</h3>
            <p className="text-xs text-zinc-400 truncate max-w-sm">
              當前歌曲：{currentTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
          >
            ✕
          </button>
        </div>

        {/* 搜尋列 */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400">🔍 搜尋官方專輯 / MV 封面：</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
              placeholder="輸入歌名或歌手關鍵字搜尋..."
              className="flex-1 px-4 py-2 text-sm bg-zinc-800/80 border border-zinc-700 rounded-xl focus:outline-none focus:border-indigo-500 text-white placeholder-zinc-500"
            />
            <button
              onClick={() => handleSearch(query)}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition"
            >
              {isLoading ? '搜尋中...' : '搜尋'}
            </button>
          </div>
        </div>

        {/* 線上搜尋結果列表 */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-400">點選下方封面即可一鍵套用：</p>
          {isLoading ? (
            <div className="h-36 flex items-center justify-center text-sm text-zinc-500">
              正在從線上音樂庫抓取高畫質封面...
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto pr-1 no-scrollbar">
              {results.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    onSelectCover(item.artworkUrl, item.artist, item.title);
                    onClose();
                  }}
                  className="group relative cursor-pointer rounded-xl overflow-hidden border border-zinc-800 hover:border-indigo-500 transition aspect-square bg-zinc-950"
                >
                  <img
                    src={item.artworkUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-end p-2 transition">
                    <p className="text-[10px] text-white font-medium truncate">{item.title}</p>
                    <p className="text-[9px] text-zinc-400 truncate">{item.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
              查無相符封面，可嘗試修改關鍵字或改用下方上傳/網址。
            </div>
          )}
        </div>

        {/* 本機上傳與網址輸入 */}
        <div className="pt-3 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1.5">📁 從電腦挑選圖片：</label>
            <label className="block text-center px-3 py-2 bg-zinc-800 hover:bg-zinc-700 cursor-pointer text-xs rounded-xl border border-zinc-700 transition">
              選取本機圖片 (JPG/PNG)
              <input
                type="file"
                accept="image/*"
                onChange={handleLocalImageUpload}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1.5">🔗 貼上 YouTube 或圖片網址：</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="貼上 YT 連結或圖片網址..."
                className="flex-1 px-3 py-1.5 text-xs bg-zinc-800/80 border border-zinc-700 rounded-xl focus:outline-none focus:border-indigo-500 text-white placeholder-zinc-500"
              />
              <button
                onClick={handleApplyCustomUrl}
                className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-xs rounded-xl transition"
              >
                套用
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
