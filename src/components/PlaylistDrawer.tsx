import React, { useState, useMemo } from 'react';
import type { SongItem, Playlist, SortOption } from '../types/song';

interface PlaylistDrawerProps {
  currentQueue: SongItem[];
  currentSongId: string | null;
  playlists: Playlist[];
  activePlaylistId: string;
  currentSort: SortOption;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectSong: (songId: string) => void;
  onRemoveSong: (songId: string) => void;
  onClearAll?: () => void;
  onSwitchPlaylist: (playlistId: string) => void;
  onCreatePlaylist: (name: string) => Promise<void>;
  onDeletePlaylist: (playlistId: string) => Promise<void>;
  onOpenSortModal: () => void;
  onOpenReportModal: () => void;
}

const SORT_LABELS: Record<SortOption, string> = {
  manual: '手動',
  'date-newest': '新增(最新)',
  'date-oldest': '新增(最舊)',
  popular: '最熱門',
  'release-newest': '發布(最新)',
  'release-oldest': '發布(最舊)',
};

export const PlaylistDrawer: React.FC<PlaylistDrawerProps> = ({
  currentQueue,
  currentSongId,
  playlists,
  activePlaylistId,
  currentSort,
  isCollapsed,
  onToggleCollapse,
  onSelectSong,
  onRemoveSong,
  onClearAll,
  onSwitchPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
  onOpenSortModal,
  onOpenReportModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  const filteredPlaylist = useMemo(() => {
    if (!searchQuery.trim()) return currentQueue;
    const q = searchQuery.toLowerCase();
    return currentQueue.filter(
      (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    );
  }, [currentQueue, searchQuery]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    await onCreatePlaylist(newListName.trim());
    setNewListName('');
    setIsCreatingList(false);
  };

  // 當清單收合時，僅顯示極簡的頂部條與 🔺 打開按鈕
  if (isCollapsed) {
    return (
      <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-3xl p-4 flex items-center justify-between shadow-xl backdrop-blur-md transition-all">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-zinc-300">播放清單</span>
          <span className="text-xs text-zinc-500 font-mono">({currentQueue.length} 首)</span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-indigo-400 hover:text-indigo-300 text-xs font-semibold rounded-xl border border-zinc-700 transition flex items-center gap-1.5"
          title="展開播放清單"
        >
          <span>🔺</span>
          <span>展開清單</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 flex flex-col h-[540px] shadow-xl backdrop-blur-xl transition-all">
      {/* 頂部標題列與功能操作按鈕 */}
      <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-zinc-200">播放清單</h3>
          <button
            onClick={onToggleCollapse}
            className="px-2 py-0.5 text-[11px] text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 rounded-lg transition border border-zinc-700/60 flex items-center gap-1"
            title="隱藏清單，只留播放畫面"
          >
            <span>🔻</span>
            <span>隱藏清單</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* 聆聽報告按鈕 */}
          <button
            onClick={onOpenReportModal}
            className="px-2.5 py-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition flex items-center gap-1"
            title="查看個人音樂聆聽與熱門次數報告"
          >
            <span>📊</span>
            <span>聆聽報告</span>
          </button>

          {/* 排序選單開啟鈕 */}
          <button
            onClick={onOpenSortModal}
            className="px-2.5 py-1 text-[11px] font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/70 rounded-xl transition flex items-center gap-1"
            title="變更歌曲排序順序"
          >
            <span>⇅</span>
            <span>{SORT_LABELS[currentSort]}</span>
          </button>
        </div>
      </div>

      {/* 播放清單切換標籤 (Tab Selector) */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => onSwitchPlaylist('all')}
          className={`px-3 py-1 text-xs rounded-xl whitespace-nowrap transition font-medium ${
            activePlaylistId === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
          }`}
        >
          全部曲庫
        </button>

        <button
          onClick={() => onSwitchPlaylist('monthly-favorites')}
          className={`px-3 py-1 text-xs rounded-xl whitespace-nowrap transition font-medium flex items-center gap-1 ${
            activePlaylistId === 'monthly-favorites'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-zinc-800/80 text-amber-400/90 hover:text-amber-300'
          }`}
        >
          <span>🌟</span>
          <span>最近一個月最愛</span>
        </button>

        {playlists.map((pl) => (
          <div key={pl.id} className="relative group shrink-0">
            <button
              onClick={() => onSwitchPlaylist(pl.id)}
              className={`px-3 py-1 pr-6 text-xs rounded-xl whitespace-nowrap transition font-medium ${
                activePlaylistId === pl.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              {pl.name}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`確定要刪除「${pl.name}」清單嗎？`)) {
                  onDeletePlaylist(pl.id);
                }
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-rose-400 opacity-60 group-hover:opacity-100 transition"
              title="刪除清單"
            >
              ×
            </button>
          </div>
        ))}

        {/* 新增清單按鈕 */}
        {!isCreatingList ? (
          <button
            onClick={() => setIsCreatingList(true)}
            className="px-2.5 py-1 text-xs bg-zinc-800/50 hover:bg-zinc-700/60 text-zinc-400 hover:text-white rounded-xl border border-dashed border-zinc-700 whitespace-nowrap transition flex items-center gap-1 shrink-0"
            title="建立自訂命名播放清單"
          >
            <span>+</span>
            <span>新清單</span>
          </button>
        ) : (
          <form onSubmit={handleCreateSubmit} className="flex items-center gap-1 shrink-0">
            <input
              type="text"
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="清單名稱..."
              className="px-2 py-0.5 text-xs bg-zinc-800 border border-indigo-500 rounded-lg text-white focus:outline-none w-28"
            />
            <button
              type="submit"
              className="px-2 py-0.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
            >
              儲存
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingList(false)}
              className="px-1 text-xs text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          </form>
        )}
      </div>

      {/* 搜尋欄位與曲目總數 */}
      <div className="mt-2.5 flex items-center gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 搜尋歌名、歌手..."
          className="flex-1 px-3 py-1.5 text-xs bg-zinc-800/70 border border-zinc-700/60 rounded-xl focus:outline-none focus:border-indigo-500 text-white placeholder-zinc-500 transition"
        />
        <span className="text-[11px] text-zinc-500 font-mono shrink-0">
          {filteredPlaylist.length} 首
        </span>
      </div>

      {/* 歌曲列表 */}
      <div className="overflow-y-auto mt-3 space-y-1.5 pr-1 flex-1 no-scrollbar">
        {filteredPlaylist.length > 0 ? (
          filteredPlaylist.map((song, idx) => {
            const isCurrent = song.id === currentSongId;
            return (
              <div
                key={song.id}
                onClick={() => onSelectSong(song.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                  isCurrent
                    ? 'bg-indigo-600/20 border border-indigo-500/30 text-white'
                    : 'hover:bg-zinc-800/60 text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-4 text-center text-xs font-mono opacity-50 shrink-0">
                    {isCurrent ? '▶' : idx + 1}
                  </span>
                  {song.coverUrl && (
                    <img
                      src={song.coverUrl}
                      alt=""
                      className="w-7 h-7 rounded-md object-cover shrink-0 border border-zinc-700/50"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-medium truncate ${
                        isCurrent ? 'text-indigo-300 font-bold' : 'text-zinc-200'
                      }`}
                    >
                      {song.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                        {song.artist}
                      </p>
                      {song.playCount !== undefined && song.playCount > 0 && (
                        <span className="text-[9px] text-indigo-400 font-mono bg-indigo-500/10 px-1 rounded">
                          {song.playCount} 次
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSong(song.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 text-zinc-600 p-1 text-xs transition ml-2 shrink-0"
                  title="移除此曲目"
                >
                  ✕
                </button>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-xs text-zinc-500 gap-1">
            <span className="text-xl">🎵</span>
            <span>{searchQuery ? '查無相符歌曲' : '此清單目前尚無歌曲'}</span>
          </div>
        )}
      </div>

      {/* 底部輔助按鈕 */}
      {onClearAll && currentQueue.length > 0 && (
        <div className="pt-2 border-t border-zinc-800/80 flex justify-between items-center text-[11px] text-zinc-500">
          <span>本機獨立儲存，重開不遺失</span>
          <button
            onClick={onClearAll}
            className="hover:text-rose-400 transition"
            title="清空目前清單"
          >
            清空清單
          </button>
        </div>
      )}
    </div>
  );
};
