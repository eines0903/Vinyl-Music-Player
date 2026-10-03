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
import { FeedbackModal } from './components/FeedbackModal';
import { ButtonSettingsModal } from './components/ButtonSettingsModal';
import { useButtonSettings } from './hooks/useButtonSettings';
import type { ButtonShape, ButtonStyleTheme } from './types/customButtons';
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
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isButtonSettingsModalOpen, setIsButtonSettingsModalOpen] = useState(false);

  // 用戶按鍵與快捷鍵個人化設定管理
  const {
    buttonBarConfig,
    shortcuts,
    saveButtonBarConfig,
    saveShortcuts,
    resetAllSettings,
  } = useButtonSettings();

  // 隱藏歌曲清單，只留播放中的歌曲 (🔻/🔺 按鈕控制)
  const [isPlaylistCollapsed, setIsPlaylistCollapsed] = useState(false);

  // 桌面寵物大小的迷你黑膠播放器
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false);

  // 播放器自訂名稱 (支援一鍵重新命名與 LocalStorage 持久化)
  const DEFAULT_PLAYER_NAME = '線上黑膠音樂播放器';
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('vinyl_player_custom_name') || DEFAULT_PLAYER_NAME;
  });
  const [isEditingPlayerName, setIsEditingPlayerName] = useState(false);
  const [tempPlayerName, setTempPlayerName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // 當播放器名稱變更時，即時更新網頁標籤頁 (Title)
  useEffect(() => {
    document.title = `${playerName} - Vinyl Player`;
  }, [playerName]);

  const handleStartRename = () => {
    setTempPlayerName(playerName);
    setIsEditingPlayerName(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 50);
  };

  const handleSavePlayerName = () => {
    const trimmed = tempPlayerName.trim();
    const finalName = trimmed || DEFAULT_PLAYER_NAME;
    setPlayerName(finalName);
    localStorage.setItem('vinyl_player_custom_name', finalName);
    setIsEditingPlayerName(false);
  };

  const handleResetPlayerName = () => {
    setPlayerName(DEFAULT_PLAYER_NAME);
    localStorage.removeItem('vinyl_player_custom_name');
    setIsEditingPlayerName(false);
  };

  const handleCancelRename = () => {
    setIsEditingPlayerName(false);
  };

  // 離線網路狀態監聽與 PWA 安裝支援
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

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

  const handleTogglePlay = useCallback(() => {
    if (!isOnline && isYouTube) {
      alert('📡 目前處於離線狀態，YouTube 串流需連接網路；請點選已匯入的本機 MP3 歌曲進行離線聆聽！');
      return;
    }
    togglePlay();
  }, [isOnline, isYouTube, togglePlay]);

  useKeyboardShortcuts({
    onTogglePlay: handleTogglePlay,
    onNext: onNext,
    onPrev: onPrev,
    onToggleMini: () => setIsMiniPlayerOpen((prev) => !prev),
    customShortcuts: shortcuts,
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

  const getButtonShapeClass = (shape: ButtonShape) => {
    if (shape === 'pill') return 'rounded-full';
    if (shape === 'squircle') return 'rounded-2xl';
    return 'rounded-xl';
  };

  const getButtonThemeClass = (
    theme: ButtonStyleTheme,
    btnId: string,
    isActive?: boolean
  ) => {
    if (theme === 'minimal') {
      return isActive
        ? 'bg-zinc-700 text-white border border-zinc-500 shadow-md'
        : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 shadow-sm';
    }
    if (theme === 'amber') {
      return isActive
        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold border border-amber-300 shadow-lg shadow-amber-500/30'
        : 'bg-gradient-to-r from-amber-700/80 to-amber-800/80 hover:from-amber-600 hover:to-amber-700 text-amber-100 border border-amber-500/50 shadow-md';
    }
    if (theme === 'neon') {
      return isActive
        ? 'bg-zinc-900 border border-pink-500 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.5)]'
        : 'bg-zinc-900 border border-cyan-500/70 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.25)] hover:border-pink-400 hover:text-pink-300';
    }

    // 預設 vibrant 經典鮮明配色 (原截圖款)
    switch (btnId) {
      case 'install':
        return 'bg-indigo-600 hover:bg-indigo-500 text-white';
      case 'mini':
        return isActive
          ? 'bg-emerald-600 border border-emerald-400 text-white shadow-emerald-500/30 shadow-md'
          : 'bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 text-zinc-200';
      case 'feedback':
        return 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40';
      case 'youtube':
        return 'bg-red-600/90 hover:bg-red-500 text-white';
      case 'upload':
        return 'bg-indigo-600 hover:bg-indigo-500 text-white';
      case 'report':
        return 'bg-emerald-600/90 hover:bg-emerald-500 text-white';
      case 'sort':
        return 'bg-purple-600/90 hover:bg-purple-500 text-white';
      case 'shuffle':
        return isShuffle
          ? 'bg-amber-500 text-black border border-amber-300 font-bold shadow-amber-500/30 shadow-md'
          : 'bg-pink-600/90 hover:bg-pink-500 text-white';
      default:
        return 'bg-zinc-800 text-white';
    }
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

      {/* 頂部標頭：播放器自訂名稱 (一鍵重新命名) + 主題風格切換 */}
      <header className="w-full max-w-6xl flex flex-wrap items-center justify-between gap-4 mb-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-xl select-none shrink-0">
            📻
          </div>

          {/* 播放器名稱展示與一鍵重新命名編輯區 */}
          {isEditingPlayerName ? (
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/20 shadow-inner">
              <input
                ref={nameInputRef}
                type="text"
                value={tempPlayerName}
                onChange={(e) => setTempPlayerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSavePlayerName();
                  if (e.key === 'Escape') handleCancelRename();
                }}
                maxLength={40}
                placeholder="輸入播放器名稱..."
                className="bg-transparent text-white text-base md:text-lg font-bold outline-none border-b border-amber-400/80 px-1 py-0.5 w-48 sm:w-64 placeholder-zinc-500"
                autoFocus
              />
              <button
                onClick={handleSavePlayerName}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition shadow"
                title="儲存名稱 (Enter)"
              >
                儲存
              </button>
              <button
                onClick={handleResetPlayerName}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition border border-zinc-700"
                title="恢復預設名稱"
              >
                預設
              </button>
              <button
                onClick={handleCancelRename}
                className="px-2 py-1 bg-transparent hover:bg-white/10 text-zinc-400 hover:text-white text-xs rounded-lg transition"
                title="取消 (Esc)"
              >
                取消
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1
                onClick={handleStartRename}
                className="text-lg md:text-2xl font-black tracking-tight text-white/95 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-2 select-none"
                title="點擊文字或按鈕即可一鍵重新命名播放器"
              >
                <span>{playerName}</span>
              </h1>
              <button
                onClick={handleStartRename}
                className="px-2.5 py-1 text-xs text-zinc-400 hover:text-amber-300 bg-white/5 hover:bg-white/15 rounded-lg border border-white/10 transition flex items-center gap-1 group-hover:border-amber-400/50"
                title="一鍵重新命名 PLAYER 的名字"
              >
                <span>✏️</span>
                <span className="hidden sm:inline font-medium">重新命名</span>
              </button>
            </div>
          )}
        </div>

        {/* 右側：主題風格切換器 */}
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
      </header>

      {/* 次頂部功能列：離線狀態 + PWA 安裝 + 桌面迷你小窗 + YouTube 連接 + MP3 上傳 */}
      <div className="w-full max-w-6xl flex flex-wrap justify-between items-center gap-3 mb-6">
        {/* 離線狀態徽章 (未離線時留白或顯示狀態) */}
        <div>
          {!isOnline && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 text-xs font-semibold animate-pulse">
              <span>📡</span>
              <span>離線模式 (本機曲庫就緒)</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {buttonBarConfig.buttons
            .filter((btn) => btn.enabled)
            .map((btn) => {
              const shapeClass = getButtonShapeClass(buttonBarConfig.shape);

              switch (btn.id) {
                case 'install':
                  if (!deferredPrompt) return null;
                  return (
                    <button
                      key={btn.id}
                      onClick={handleInstallApp}
                      className={`px-3.5 py-2 text-xs font-semibold shadow-md flex items-center gap-1.5 transition active:scale-95 ${shapeClass} ${getButtonThemeClass(
                        buttonBarConfig.styleTheme,
                        btn.id
                      )}`}
                      title="安裝為獨立桌面/手機離線應用程式"
                    >
                      <span className="text-sm">{btn.icon}</span>
                      <span>{btn.label}</span>
                    </button>
                  );

                case 'mini':
                  return (
                    <button
                      key={btn.id}
                      onClick={() => setIsMiniPlayerOpen(!isMiniPlayerOpen)}
                      className={`px-3.5 py-2 text-xs font-semibold shadow-md flex items-center gap-1.5 transition active:scale-95 border ${shapeClass} ${getButtonThemeClass(
                        buttonBarConfig.styleTheme,
                        btn.id,
                        isMiniPlayerOpen
                      )}`}
                      title="開啟/收合桌面寵物大小的迷你黑膠播放器"
                    >
                      <span className="text-sm">{btn.icon}</span>
                      <span>{isMiniPlayerOpen ? '關閉迷你小窗' : btn.label}</span>
                    </button>
                  );

                case 'feedback':
                  return (
                    <button
                      key={btn.id}
                      onClick={() => setIsFeedbackModalOpen(true)}
                      className={`px-3.5 py-2 text-xs font-semibold shadow-md flex items-center gap-1.5 transition active:scale-95 border ${shapeClass} ${getButtonThemeClass(
                        buttonBarConfig.styleTheme,
                        btn.id
                      )}`}
                      title="用戶問題回報與功能建議 (支援每月試算表匯出)"
                    >
                      <span className="text-sm">{btn.icon}</span>
                      <span>{btn.label}</span>
                    </button>
                  );

                case 'youtube':
                  return (
                    <button
                      key={btn.id}
                      onClick={() => setIsYouTubeModalOpen(true)}
                      className={`px-3.5 py-2 text-xs font-semibold shadow-md flex items-center gap-1.5 transition active:scale-95 ${shapeClass} ${getButtonThemeClass(
                        buttonBarConfig.styleTheme,
                        btn.id
                      )}`}
                      title="連接 YouTube MV 或音訊"
                    >
                      <span className="text-sm">{btn.icon}</span>
                      <span>{btn.label}</span>
                    </button>
                  );

                case 'upload':
                  return (
                    <BatchUploader key={btn.id} onSongsAdded={addSongs}>
                      {(trigger, isProcessing) => (
                        <button
                          onClick={trigger}
                          disabled={isProcessing}
                          className={`px-3.5 py-2 text-xs font-semibold shadow-md flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 ${shapeClass} ${getButtonThemeClass(
                            buttonBarConfig.styleTheme,
                            btn.id
                          )}`}
                          title="匯入本機多首 MP3 檔案"
                        >
                          <span className="text-sm">{btn.icon}</span>
                          <span>{isProcessing ? '儲存解析中...' : btn.label}</span>
                        </button>
                      )}
                    </BatchUploader>
                  );

                case 'report':
                  return (
                    <button
                      key={btn.id}
                      onClick={() => setIsReportModalOpen(true)}
                      className={`px-3.5 py-2 text-xs font-semibold shadow-md flex items-center gap-1.5 transition active:scale-95 ${shapeClass} ${getButtonThemeClass(
                        buttonBarConfig.styleTheme,
                        btn.id
                      )}`}
                      title="查看個人黑膠聆聽報告與熱門統計"
                    >
                      <span className="text-sm">{btn.icon}</span>
                      <span>{btn.label}</span>
                    </button>
                  );

                case 'sort':
                  return (
                    <button
                      key={btn.id}
                      onClick={() => setIsSortModalOpen(true)}
                      className={`px-3.5 py-2 text-xs font-semibold shadow-md flex items-center gap-1.5 transition active:scale-95 ${shapeClass} ${getButtonThemeClass(
                        buttonBarConfig.styleTheme,
                        btn.id
                      )}`}
                      title="切換歌曲排序方式"
                    >
                      <span className="text-sm">{btn.icon}</span>
                      <span>{btn.label}</span>
                    </button>
                  );

                case 'shuffle':
                  return (
                    <button
                      key={btn.id}
                      onClick={toggleShuffle}
                      className={`px-3.5 py-2 text-xs font-semibold shadow-md flex items-center gap-1.5 transition active:scale-95 ${shapeClass} ${getButtonThemeClass(
                        buttonBarConfig.styleTheme,
                        btn.id,
                        isShuffle
                      )}`}
                      title="隨機洗牌播放"
                    >
                      <span className="text-sm">{btn.icon}</span>
                      <span>{btn.label}</span>
                    </button>
                  );

                default:
                  return null;
              }
            })}

          {/* 調整按鍵個人化設定按鈕 */}
          <button
            onClick={() => setIsButtonSettingsModalOpen(true)}
            className="px-2.5 py-2 text-zinc-400 hover:text-amber-300 hover:bg-white/10 rounded-xl transition flex items-center gap-1 text-xs border border-transparent hover:border-zinc-700 active:scale-95"
            title="調整按鍵順序、自訂文字、形狀外觀與快捷鍵"
          >
            <span className="text-sm">⚙️</span>
            <span className="hidden sm:inline text-[11px] font-medium">調整按鍵</span>
          </button>
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
                      onClick={handleTogglePlay}
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
          playerName={playerName}
          currentSong={currentSong}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          playbackMode={playbackMode}
          onTogglePlay={handleTogglePlay}
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

      {/* 用戶回饋問題與每月試算表匯出彈窗 */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />

      {/* 按鍵與快捷鍵個人化設定彈窗 */}
      <ButtonSettingsModal
        isOpen={isButtonSettingsModalOpen}
        onClose={() => setIsButtonSettingsModalOpen(false)}
        config={buttonBarConfig}
        shortcuts={shortcuts}
        onSaveConfig={saveButtonBarConfig}
        onSaveShortcuts={saveShortcuts}
        onResetAll={resetAllSettings}
      />

      {/* 頁尾主創致敬標記與用戶回饋按鈕 */}
      <footer className="mt-8 text-center text-xs text-zinc-500 tracking-wider flex flex-wrap items-center justify-center gap-3">
        <div>
          Designed & Built by{' '}
          <span className="text-zinc-300 font-medium">温采穎</span> &{' '}
          <span className="text-zinc-300 font-medium">蔡懷萱</span>
        </div>
        <span className="hidden sm:inline text-zinc-700">•</span>
        <button
          onClick={() => setIsFeedbackModalOpen(true)}
          className="text-zinc-400 hover:text-amber-400 transition underline underline-offset-4 flex items-center gap-1"
          title="回報問題或提供新功能建議"
        >
          <span>💬</span>
          <span>問題回饋與每月報表</span>
        </button>
      </footer>
    </div>
  );
}
