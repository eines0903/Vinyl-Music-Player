import React, { useState, useEffect } from 'react';
import {
  searchOnlineLyrics,
  cleanSongQuery,
  type LyricSearchResult,
} from '../utils/lyricSearch';

interface LyricModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTitle: string;
  currentArtist: string;
  currentLrc: string;
  onSaveLyric: (lrcContent: string) => void;
}

export const LyricModal: React.FC<LyricModalProps> = ({
  isOpen,
  onClose,
  currentTitle,
  currentArtist,
  currentLrc,
  onSaveLyric,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'manual'>('search');
  const [searchTitle, setSearchTitle] = useState(currentTitle);
  const [searchArtist, setSearchArtist] = useState(currentArtist);
  const [searchResults, setSearchResults] = useState<LyricSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [manualText, setManualText] = useState(currentLrc || '');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const { cleanTitle, cleanArtist } = cleanSongQuery(currentTitle, currentArtist);
      setSearchTitle(cleanTitle || currentTitle);
      setSearchArtist(cleanArtist || (currentArtist === '未知歌手' ? '' : currentArtist));
      setManualText(currentLrc || '');
      setStatusMsg('');
      handleSearch(cleanTitle || currentTitle, cleanArtist || currentArtist);
    }
  }, [isOpen, currentTitle, currentArtist, currentLrc]);

  if (!isOpen) return null;

  const handleSearch = async (t?: string, a?: string) => {
    const titleToUse = t !== undefined ? t : searchTitle;
    const artistToUse = a !== undefined ? a : searchArtist;

    if (!titleToUse.trim()) return;

    setIsSearching(true);
    setStatusMsg('');
    try {
      const results = await searchOnlineLyrics(titleToUse, artistToUse);
      setSearchResults(results);
      if (results.length === 0) {
        setStatusMsg('未找到相符歌詞，您可以嘗試精簡歌名或切換到「手動編輯」貼上歌詞。');
      }
    } catch {
      setStatusMsg('連線歌詞庫失敗，請檢查網路。');
    }
    setIsSearching(false);
  };

  const handleApplySearchResult = (item: LyricSearchResult) => {
    const lrc = item.syncedLyrics || item.plainLyrics || '';
    if (!lrc) {
      alert('該項目無有效歌詞資料');
      return;
    }
    onSaveLyric(lrc);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setManualText(content);
        setStatusMsg(`已載入檔案: ${file.name}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveManual = () => {
    onSaveLyric(manualText.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl text-white flex flex-col max-h-[85vh] overflow-hidden">
        {/* 標頭 */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-indigo-400 text-lg">📝</span>
            <div>
              <h3 className="text-base font-bold text-zinc-100">歌詞管理與自動搜尋</h3>
              <p className="text-xs text-zinc-400 truncate max-w-sm sm:max-w-md">
                目前曲目：{currentTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
          >
            ✕
          </button>
        </div>

        {/* 標籤頁切換 */}
        <div className="flex border-b border-zinc-800/80 bg-zinc-950/40 px-5 shrink-0">
          <button
            onClick={() => setActiveTab('search')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'search'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <span>🌐</span>
            <span>線上自動搜尋 (LRCLIB)</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'manual'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <span>✏️</span>
            <span>手動貼上 / 匯入 .lrc</span>
          </button>
        </div>

        {/* 內容區域 */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 no-scrollbar">
          {activeTab === 'search' ? (
            <div className="space-y-4">
              {/* 搜尋條件輸入 */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  placeholder="歌名 (例: 晴天)"
                  className="flex-1 px-3 py-2 text-xs bg-zinc-800/80 border border-zinc-700 rounded-xl focus:outline-none focus:border-indigo-500 text-white placeholder-zinc-500"
                />
                <input
                  type="text"
                  value={searchArtist}
                  onChange={(e) => setSearchArtist(e.target.value)}
                  placeholder="歌手 (可選)"
                  className="sm:w-36 px-3 py-2 text-xs bg-zinc-800/80 border border-zinc-700 rounded-xl focus:outline-none focus:border-indigo-500 text-white placeholder-zinc-500"
                />
                <button
                  onClick={() => handleSearch()}
                  disabled={isSearching}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1 shrink-0"
                >
                  {isSearching ? (
                    <>
                      <span className="animate-spin text-sm">⌛</span>
                      <span>搜尋中...</span>
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      <span>搜尋歌詞</span>
                    </>
                  )}
                </button>
              </div>

              {statusMsg && (
                <p className="text-xs text-amber-400/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                  {statusMsg}
                </p>
              )}

              {/* 候選清單 */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  搜尋結果 ({searchResults.length})
                </p>

                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {searchResults.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-zinc-800/50 hover:bg-zinc-800/90 border border-zinc-700/60 rounded-2xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-zinc-100 truncate">
                              {item.trackName}
                            </span>
                            <span className="text-xs text-zinc-400 truncate">
                              · {item.artistName}
                            </span>
                            {item.isSynced ? (
                              <span className="px-2 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-medium shrink-0">
                                ⏰ 動態時間軸同步
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[9px] bg-zinc-700 text-zinc-300 rounded-full font-medium shrink-0">
                                📄 純文字歌詞
                              </span>
                            )}
                          </div>
                          {item.albumName && (
                            <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                              專輯: {item.albumName}
                            </p>
                          )}
                          <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 italic font-mono opacity-80">
                            {item.syncedLyrics
                              ? item.syncedLyrics.slice(0, 120).replace(/\[\d+:\d+\.\d+\]/g, '')
                              : item.plainLyrics?.slice(0, 120)}
                            ...
                          </p>
                        </div>

                        <button
                          onClick={() => handleApplySearchResult(item)}
                          className="px-3.5 py-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition shrink-0 shadow flex items-center justify-center gap-1"
                        >
                          <span>✓</span>
                          <span>套用此歌詞</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  !isSearching && (
                    <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs">
                      暫無搜尋結果，請確認歌名後再次搜尋。
                    </div>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-zinc-400">
                  可直接貼上歌詞，支援純文字或帶時間戳記的動態歌詞格式（LRC）：
                </p>
                <label className="cursor-pointer px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition flex items-center gap-1">
                  <span>📁</span>
                  <span>匯入 .lrc 檔案</span>
                  <input
                    type="file"
                    accept=".lrc,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="[00:15.30]第一句歌詞&#10;[00:19.45]第二句歌詞&#10;（或直接貼上純文字歌詞，亦可使用 ChatGPT / Gemini 生成之 LRC 歌詞）"
                rows={10}
                className="w-full p-3.5 text-xs font-mono bg-zinc-950/80 border border-zinc-800 rounded-2xl focus:outline-none focus:border-indigo-500 text-zinc-200 placeholder-zinc-600 resize-none leading-relaxed"
              />

              <div className="bg-zinc-800/40 p-3 rounded-xl border border-zinc-700/40 text-[11px] text-zinc-400 space-y-1">
                <p className="font-semibold text-zinc-300">💡 提示：</p>
                <p>• 格式範例：`[分:秒.毫秒] 歌詞文字`（例如 `[01:23.45] 繁星點點`）。</p>
                <p>• 若貼上純文字（無時間戳記），播放器將以優雅的滾動純文字面板呈現。</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveManual}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow"
                >
                  儲存歌詞
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
