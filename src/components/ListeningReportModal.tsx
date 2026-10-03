import React from 'react';
import type { SongItem } from '../types/song';

interface ListeningReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  songs: SongItem[];
  onPlayMonthlyFavorites: () => void;
}

export const ListeningReportModal: React.FC<ListeningReportModalProps> = ({
  isOpen,
  onClose,
  songs,
  onPlayMonthlyFavorites,
}) => {
  if (!isOpen) return null;

  // 計算統計數據
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // 1. 最近一個月有播放記錄或有播放次數的歌曲
  const monthlyPlayedSongs = songs
    .filter((s) => (s.playCount || 0) > 0 && (!s.lastPlayedAt || s.lastPlayedAt >= thirtyDaysAgo))
    .sort((a, b) => (b.playCount || 0) - (a.playCount || 0));

  // 所有有播放次數的歌曲排序
  const allTimeRanked = [...songs]
    .filter((s) => (s.playCount || 0) > 0)
    .sort((a, b) => (b.playCount || 0) - (a.playCount || 0));

  const totalPlays = songs.reduce((sum, s) => sum + (s.playCount || 0), 0);

  // 計算最常聽歌手
  const artistMap = new Map<string, number>();
  for (const s of songs) {
    if (s.artist && s.artist !== '未知歌手' && s.artist !== 'YouTube') {
      const count = artistMap.get(s.artist) || 0;
      artistMap.set(s.artist, count + (s.playCount || 0));
    }
  }
  let topArtist = '暫無統計';
  let topArtistPlays = 0;
  for (const [artist, plays] of artistMap.entries()) {
    if (plays > topArtistPlays) {
      topArtist = artist;
      topArtistPlays = plays;
    }
  }

  const topSong = allTimeRanked[0] || null;
  const topFive = allTimeRanked.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-950/60 border border-zinc-700/80 rounded-3xl shadow-2xl p-6 sm:p-8 text-white space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* 標頭 */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2.5 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
              📊
            </span>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>個人黑膠聆聽報告</span>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/40">
                  Monthly Wrapped
                </span>
              </h3>
              <p className="text-xs text-zinc-400">專屬於您的專屬音樂品味與播放次數統計</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
          >
            ✕
          </button>
        </div>

        {/* 核心指標卡片列 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 bg-zinc-800/60 border border-zinc-700/50 rounded-2xl text-center">
            <p className="text-[11px] text-zinc-400">總累計聆聽次數</p>
            <p className="text-2xl font-bold text-indigo-400 mt-1">{totalPlays}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">次播放</p>
          </div>
          <div className="p-3.5 bg-zinc-800/60 border border-zinc-700/50 rounded-2xl text-center">
            <p className="text-[11px] text-zinc-400">本月常聽歌曲數</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{monthlyPlayedSongs.length}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">首最愛</p>
          </div>
          <div className="p-3.5 bg-zinc-800/60 border border-zinc-700/50 rounded-2xl text-center truncate">
            <p className="text-[11px] text-zinc-400">最喜愛歌手</p>
            <p className="text-lg font-bold text-emerald-400 mt-1 truncate" title={topArtist}>
              {topArtist}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{topArtistPlays} 次聆聽</p>
          </div>
        </div>

        {/* 冠軍歌曲 Showcase */}
        {topSong ? (
          <div className="p-4 bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={topSong.coverUrl}
                alt=""
                className="w-16 h-16 rounded-xl object-cover border border-amber-500/40 shadow-lg"
              />
              <span className="absolute -top-2 -left-2 text-xl">👑</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase">
                  最受您青睞的冠軍單曲
                </span>
              </div>
              <h4 className="text-sm font-bold text-white truncate mt-0.5">{topSong.title}</h4>
              <p className="text-xs text-zinc-400 truncate">{topSong.artist}</p>
              <p className="text-[11px] text-amber-300 font-mono mt-1">
                已循環播放 <span className="font-bold">{topSong.playCount || 0}</span> 次
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs">
            目前尚未累積播放次數，開始聆聽您喜愛的歌曲，系統將為您生成個人專屬排行！
          </div>
        )}

        {/* Top 5 歌曲列表 */}
        {topFive.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
              🏆 最愛單曲排行榜 (Top 5)
            </h4>
            <div className="space-y-1.5">
              {topFive.map((song, idx) => (
                <div
                  key={song.id}
                  className="flex items-center justify-between p-2.5 bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/40 rounded-xl transition"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={`w-5 text-center font-bold text-xs ${
                        idx === 0
                          ? 'text-amber-400'
                          : idx === 1
                          ? 'text-zinc-300'
                          : idx === 2
                          ? 'text-amber-600'
                          : 'text-zinc-500'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <img
                      src={song.coverUrl}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{song.title}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{song.artist}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20 shrink-0">
                    {song.playCount || 0} 次
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 底部按鈕區 */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-between items-center border-t border-zinc-800">
          <p className="text-[11px] text-zinc-500">本報告依據本機獨立資料庫真實播放即時生成</p>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                onPlayMonthlyFavorites();
                onClose();
              }}
              className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow flex items-center justify-center gap-1.5"
            >
              <span>✨</span>
              <span>播放「最近一個月最愛」清單</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-xl transition"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
