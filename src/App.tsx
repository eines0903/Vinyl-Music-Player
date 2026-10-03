import { useState, useEffect, useCallback, useRef } from 'react';
import { THEMES, type Theme } from './constants/themes';
import { usePlaylistManager } from './hooks/usePlaylistManager';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { parseLyrics } from './utils/lyricParser';
import { formatTime } from './utils/formatTime';
import { VinylRecord } from './components/VinylRecord';
import { LyricViewer } from './components/LyricViewer';
import { PlaylistDrawer } from './components/PlaylistDrawer';
import { BatchUploader } from './components/BatchUploader';
import { CoverModal } from './components/CoverModal';
import { YouTubeModal } from './components/YouTubeModal';
import { LyricModal } from './components/LyricModal';
import { SortModal } from './components/SortModal';
import { ListeningReportModal } from './components/ListeningReportModal';
import { MiniPlayer } from './components/MiniPlayer';
import {
  loadAllSongsFromDB,
  deleteSongFromDB,
  updateSongInDB,
  saveSongToDB,
} from './utils/indexedDb';
import type { SongItem } from './types/song';

export default function App() {
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [isLyricModalOpen, setIsLyricModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // 隱藏歌曲清單，只留播放中的歌曲 (🔻/🔺 按鈕控制)
  const [isPlaylistCollapsed, setIsPlaylistCollapsed] = useState(false);

  // 桌面寵物大小的迷你黑膠播放器
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false);

  const {
    allSongs,
    playlists,
    activePlaylistId,
    setActivePlaylistId,
    currentSort,
    setCurrentSort,
    currentSong,
    currentQueue,
    isShuffle,
    toggleShuffle,
    handleNext,
    handlePrev,
    selectSongById,
    addSongs,
    removeSong,
    updateSong,
    setAllSongs,
    clearAll,
    recordPlay,
    createPlaylist,
    deletePlaylist,
  } = usePlaylistManager();

  const {
    audioRef,
    isYouTube,
    isPlaying,
    currentTime,
    duration,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    playbackMode,
    setPlaybackMode,
    togglePlay,
    startPlayback,
    handleLoadedMetadata,
    handleTimeUpdate,
    handleSeekChange,
    handleSeekCommit,
  } = useAudioPlayer(currentSong?.audioUrl || '', handleNext);

  const onNext = useCallback(() => {
    startPlayback();
    handleNext();
  }, [startPlayback, handleNext]);

  const onPrev = useCallback(() => {
    startPlayback();
    handlePrev();
  }, [startPlayback, handlePrev]);

  const onSelectSong = useCallback(
    (songId: string) => {
      startPlayback();
      selectSongById(songId);
    },
    [startPlayback, selectSongById]
  );

  // 循環播放模式切換：循環播放同一首、自動播放下一首、不要自動播放
  const cyclePlaybackMode = useCallback(() => {
    setPlaybackMode((prev) => {
      if (prev === 'loop-all') return 'loop-one';
      if (prev === 'loop-one') return 'stop-after';
      return 'loop-all';
    });
  }, [setPlaybackMode]);

  // 頁面載入時從本機 IndexedDB 資料庫還原歌曲庫與歷史記錄
  useEffect(() => {
    loadAllSongsFromDB()
      .then((savedSongs) => {
        if (savedSongs && savedSongs.length > 0) {
          setAllSongs(savedSongs);
        }
      })
      .catch((err) => console.warn('載入本機歷史歌曲庫失敗:', err));
  }, [setAllSongs]);

  // 聆聽計數自動統計：當歌曲播放超過 3 秒時，計入播放次數與最後播放時間
  const recordedSongRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      isPlaying &&
      currentSong &&
      currentTime > 3 &&
      recordedSongRef.current !== currentSong.id
    ) {
      recordedSongRef.current = currentSong.id;
      recordPlay(currentSong.id);
    }
  }, [isPlaying, currentSong, currentTime, recordPlay]);

  useEffect(() => {
    if (currentSong?.id !== recordedSongRef.current) {
      recordedSongRef.current = null;
    }
  }, [currentSong?.id]);

  useKeyboardShortcuts({
    onTogglePlay: togglePlay,
    onNext: onNext,
    onPrev: onPrev,
  });

  const lyricData = parseLyrics(currentSong?.lrcContent || '');

  const handleRemoveSong = async (songId: string) => {
    const target = currentQueue.find((s) => s.id === songId);
    if (target) {
      if (target.audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.audioUrl);
      }
      if (target.coverUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.coverUrl);
      }
    }
    removeSong(songId);
    await deleteSongFromDB(songId);
  };

  const handleClearAll = async () => {
    for (const song of currentQueue) {
      await deleteSongFromDB(song.id);
      if (song.audioUrl.startsWith('blob:')) URL.revokeObjectURL(song.audioUrl);
    }
    clearAll();
  };

  const handleSelectCover = async (
    newCoverUrl: string,
    newArtist?: string,
    newTitle?: string
  ) => {
    if (currentSong) {
      const updates: Partial<SongItem> = { coverUrl: newCoverUrl };
      if (newArtist && currentSong.artist === '未知歌手') {
        updates.artist = newArtist;
      }
      if (
        newTitle &&
        (currentSong.title.includes('_128k') || currentSong.title.includes('MV'))
      ) {
        updates.title = newTitle;
      }
      updateSong(currentSong.id, updates);
      await updateSongInDB(currentSong.id, updates);
    }
  };

  const handleSaveLyric = async (newLrc: string) => {
    if (currentSong) {
      const updates: Partial<SongItem> = { lrcContent: newLrc };
      updateSong(currentSong.id, updates);
      await updateSongInDB(currentSong.id, updates);
    }
  };

  const handleAddYouTubeSong = async (newSong: SongItem) => {
    addSongs([newSong]);
    await saveSongToDB(newSong);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`min-h-screen w-full bg-gradient-to-br ${currentTheme.bgGradient} transition-colors duration-700 p-4 md:p-8 flex flex-col items-center justify-between text-white font-sans`}
    >
      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
      />
      {/* 隱形但維持渲染的 YouTube 播放節點，確保背景音訊順暢播放 */}
      <div
        id="yt-player-container"
        style={{
          position: 'fixed',
          bottom: -50,
          right: -50,
          width: 1,
          height: 1,
          opacity: 0.01,
          pointerEvents: 'none',
        }}
      />

      {/* 頂部操作列：主題切換 + 迷你桌面模式切換 + YouTube 連接 + MP3 上傳 */}
      <div className="w-full max-w-6xl flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setCurrentTheme(theme)}
              className={`px-3 py-1 text-xs rounded-full transition-all ${
                currentTheme.id === theme.id
                  ? `${theme.accent} text-white`
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {theme.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* 桌面寵物黑膠迷你播放器開關按鈕 */}
          <button
            onClick={() => setIsMiniPlayerOpen(!isMiniPlayerOpen)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition shadow-md flex items-center gap-1.5 border ${
              isMiniPlayerOpen
                ? 'bg-emerald-600 border-emerald-400 text-white'
                : 'bg-zinc-800/90 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
            }`}
            title="開啟/收合桌面寵物大小的迷你黑膠播放器"
          >
            <span className="text-sm">🗗</span>
            <span>{isMiniPlayerOpen ? '關閉迷你小窗' : '桌面迷你黑膠'}</span>
          </button>

          <button
            onClick={() => setIsYouTubeModalOpen(true)}
            className="px-3.5 py-2 bg-red-600/90 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition shadow-md flex items-center gap-1.5"
          >
            <span className="text-sm">▶</span>
            <span>連接 YouTube</span>
          </button>
          <BatchUploader onSongsAdded={addSongs} />
        </div>
      </div>

      {/* 主體播放區與清單區 */}
      {currentSong ? (
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 min-w-0">
          {/* 左側：主播放器卡片 (若清單收合，自動寬幅置中展示) */}
          <div
            className={`${
              isPlaylistCollapsed
                ? 'lg:col-span-12 max-w-3xl mx-auto w-full'
                : 'lg:col-span-7 xl:col-span-8'
            } p-6 md:p-8 rounded-3xl backdrop-blur-xl border shadow-2xl flex flex-col md:flex-row gap-6 md:gap-8 items-center min-w-0 overflow-hidden transition-all duration-300 ${
              currentTheme.cardBg
            }`}
          >
            <VinylRecord
              coverUrl={currentSong.coverUrl}
              title={currentSong.title}
              isPlaying={isPlaying}
              onEditCover={() => setIsCoverModalOpen(true)}
            />

            <div className="flex-1 w-full min-w-0 flex flex-col h-[320px] md:h-[310px] justify-between overflow-hidden">
              {/* 歌名與歌手 */}
              <div className="min-w-0 shrink-0 h-12 flex flex-col justify-center">
                <div className="flex items-center justify-between gap-2">
                  <h2
                    className="text-base sm:text-lg font-bold tracking-tight truncate text-white flex items-center gap-2"
                    title={currentSong.title}
                  >
                    <span className="truncate">{currentSong.title}</span>
                    {isYouTube && (
                      <span className="px-1.5 py-0.5 text-[9px] bg-red-600/90 text-white rounded font-medium shrink-0">
                        YouTube
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setIsLyricModalOpen(true)}
                      className="px-2 py-1 text-[10px] bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700/50 transition flex items-center gap-1"
                      title="搜尋、自訂或編輯此歌曲歌詞"
                    >
                      <span>📝</span>
                      <span>歌詞</span>
                    </button>
                    <button
                      onClick={() => setIsCoverModalOpen(true)}
                      className="px-2 py-1 text-[10px] bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700/50 transition flex items-center gap-1"
                      title="更換或搜尋此歌曲封面"
                    >
                      <span>📷</span>
                      <span>換封面</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400 font-medium truncate mt-0.5">
                  <span className="truncate" title={currentSong.artist}>
                    {currentSong.artist}
                  </span>
                  {currentSong.playCount !== undefined && currentSong.playCount > 0 && (
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
                      🔥 累計播過 {currentSong.playCount} 次
                    </span>
                  )}
                </div>
              </div>

              {/* 歌詞元件 */}
              <div className="my-auto py-1 shrink-0">
                <LyricViewer
                  lyricData={lyricData}
                  currentTime={currentTime}
                  accentTextClass={currentTheme.accentText}
                  onClick={() => setIsLyricModalOpen(true)}
                />
              </div>

              {/* 進度條與播放控制按鈕 */}
              <div className="mt-auto pt-2 space-y-2.5 shrink-0">
                {/* 進度條 */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeekChange}
                    onMouseUp={handleSeekCommit}
                    onTouchEnd={handleSeekCommit}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, currentColor ${progressPercent}%, #3f3f46 ${progressPercent}%)`,
                    }}
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* 播放控制按鈕列 */}
                <div className="flex items-center justify-between pt-1">
                  {/* 左側：模式切換 (單曲循環 / 播完停止 / 自動播放下一首) */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={cyclePlaybackMode}
                      className={`p-2 rounded-xl text-xs font-medium border transition flex items-center gap-1 ${
                        playbackMode === 'loop-one'
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                          : playbackMode === 'stop-after'
                          ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                          : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
                      }`}
                      title="點擊切換循環播放模式"
                    >
                      <span>
                        {playbackMode === 'loop-one'
                          ? '🔂'
                          : playbackMode === 'stop-after'
                          ? '⏹️'
                          : '🔁'}
                      </span>
                      <span className="text-[10px] hidden sm:inline">
                        {playbackMode === 'loop-one'
                          ? '單曲循環'
                          : playbackMode === 'stop-after'
                          ? '播完即停'
                          : '自動下一首'}
                      </span>
                    </button>

                    <button
                      onClick={toggleShuffle}
                      className={`p-2 rounded-xl border transition ${
                        isShuffle
                          ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
                          : 'text-zinc-500 border-transparent hover:text-white'
                      }`}
                      title={isShuffle ? '隨機播放：開啟' : '隨機播放：關閉'}
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                      </svg>
                    </button>
                  </div>

                  {/* 中間：上一首、播放/暫停、下一首 */}
                  <div className="flex items-center gap-5">
                    <button
                      onClick={onPrev}
                      className="text-zinc-400 hover:text-white transition"
                      title="上一首 (快捷鍵: ←)"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                      </svg>
                    </button>

                    <button
                      onClick={togglePlay}
                      className={`p-3.5 rounded-full text-white shadow-xl active:scale-95 transition ${currentTheme.accent}`}
                      title="播放/暫停 (快捷鍵: 空白鍵)"
                    >
                      {isPlaying ? (
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 fill-current translate-x-0.5"
                          viewBox="0 0 24 24"
                        >
                          <path d="M5 3l14 9-14 9V3z" />
                        </svg>
                      )}
                    </button>

                    <button
                      onClick={onNext}
                      className="text-zinc-400 hover:text-white transition"
                      title="下一首 (快捷鍵: →)"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                      </svg>
                    </button>
                  </div>

                  {/* 右側：音量控制與靜音 */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={toggleMute}
                      className="text-zinc-400 hover:text-white p-1 transition"
                      title={isMuted ? '取消靜音' : '靜音'}
                    >
                      {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      title={`音量: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右側：播放清單 (支援 🔻/🔺 折疊收起) */}
          <div
            className={`${
              isPlaylistCollapsed ? 'lg:col-span-12' : 'lg:col-span-5 xl:col-span-4'
            } min-w-0 w-full transition-all duration-300`}
          >
            <PlaylistDrawer
              currentQueue={currentQueue}
              currentSongId={currentSong.id}
              playlists={playlists}
              activePlaylistId={activePlaylistId}
              currentSort={currentSort}
              isCollapsed={isPlaylistCollapsed}
              onToggleCollapse={() => setIsPlaylistCollapsed(!isPlaylistCollapsed)}
              onSelectSong={onSelectSong}
              onRemoveSong={handleRemoveSong}
              onClearAll={handleClearAll}
              onSwitchPlaylist={setActivePlaylistId}
              onCreatePlaylist={async (name) => {
                await createPlaylist(name);
              }}
              onDeletePlaylist={async (id) => {
                await deletePlaylist(id);
              }}
              onOpenSortModal={() => setIsSortModalOpen(true)}
              onOpenReportModal={() => setIsReportModalOpen(true)}
            />
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md p-12 border border-dashed border-zinc-800 rounded-3xl text-center text-zinc-500 text-sm space-y-4 my-auto">
          <p className="text-3xl">💿</p>
          <p>尚未匯入音樂或歷史歌曲庫為空。</p>
          <p className="text-xs text-zinc-600">
            點擊右上角「+ 匯入多首 MP3」或「▶ 連接 YouTube」開始播放。
          </p>
        </div>
      )}

      {/* 桌面寵物大小的迷你黑膠懸浮播放器 */}
      {isMiniPlayerOpen && (
        <MiniPlayer
          currentSong={currentSong}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          playbackMode={playbackMode}
          onTogglePlay={togglePlay}
          onNext={onNext}
          onPrev={onPrev}
          onVolumeChange={setVolume}
          onToggleMute={toggleMute}
          onTogglePlaybackMode={cyclePlaybackMode}
          onExpand={() => setIsMiniPlayerOpen(false)}
        />
      )}

      {/* 歌曲排序方式選單 (手動、新增日期最新/最舊、熱門度、發布日期最新/最舊) */}
      <SortModal
        isOpen={isSortModalOpen}
        onClose={() => setIsSortModalOpen(false)}
        currentSort={currentSort}
        onSelectSort={setCurrentSort}
      />

      {/* 個人黑膠聆聽報告與熱門統計彈窗 */}
      <ListeningReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        songs={allSongs}
        onPlayMonthlyFavorites={() => {
          setActivePlaylistId('monthly-favorites');
          setIsReportModalOpen(false);
        }}
      />

      {/* 封面自訂 / 線上自動搜尋彈窗 */}
      <CoverModal
        isOpen={isCoverModalOpen}
        onClose={() => setIsCoverModalOpen(false)}
        currentTitle={currentSong?.title || ''}
        currentArtist={currentSong?.artist || ''}
        onSelectCover={handleSelectCover}
      />

      {/* YouTube MV / 音訊匯入彈窗 */}
      <YouTubeModal
        isOpen={isYouTubeModalOpen}
        onClose={() => setIsYouTubeModalOpen(false)}
        onAddSong={handleAddYouTubeSong}
      />

      {/* 歌詞管理與自動搜尋彈窗 */}
      <LyricModal
        isOpen={isLyricModalOpen}
        onClose={() => setIsLyricModalOpen(false)}
        currentTitle={currentSong?.title || ''}
        currentArtist={currentSong?.artist || ''}
        currentLrc={currentSong?.lrcContent || ''}
        onSaveLyric={handleSaveLyric}
      />

      {/* 頁尾主創致敬標記 */}
      <footer className="mt-8 text-center text-xs text-zinc-500 tracking-wider">
        Designed & Built by{' '}
        <span className="text-zinc-300 font-medium">温采穎</span> &{' '}
        <span className="text-zinc-300 font-medium">蔡懷萱</span>
      </footer>
    </div>
  );
}
