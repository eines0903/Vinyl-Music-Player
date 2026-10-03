import React, { useState, useRef, useEffect } from 'react';
import type { SongItem, PlaybackMode } from '../types/song';

interface MiniPlayerProps {
  currentSong: SongItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackMode: PlaybackMode;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onTogglePlaybackMode: () => void;
  onExpand: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  currentSong,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  playbackMode,
  onTogglePlay,
  onNext,
  onPrev,
  onVolumeChange,
  onToggleMute,
  onTogglePlaybackMode,
  onExpand,
}) => {
  // 可拖曳位置 (桌面寵物般自由拖曳到螢幕任一處)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    // 預設位於右下角
    const initialX = Math.max(20, window.innerWidth - 320);
    const initialY = Math.max(20, window.innerHeight - 240);
    return { x: initialX, y: initialY };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    // 若點擊的是控制按鈕或滑桿，不觸發拖曳
    if ((e.target as HTMLElement).closest('button, input')) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      const newX = Math.min(Math.max(10, dragStartRef.current.posX + dx), window.innerWidth - 300);
      const newY = Math.min(Math.max(10, dragStartRef.current.posY + dy), window.innerHeight - 200);
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={handleMouseDown}
      className={`fixed z-50 w-72 bg-zinc-900/95 backdrop-blur-2xl border border-zinc-700/80 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-4 text-white select-none transition-shadow ${
        isDragging ? 'cursor-grabbing shadow-indigo-500/20' : 'cursor-grab'
      }`}
    >
      {/* 頂部拖曳把手與全螢幕放大按鈕 */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90 animate-pulse" />
          <span className="text-[10px] font-bold tracking-wider text-zinc-400">
            桌面迷你黑膠 (零廣告)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onExpand}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
            title="還原回完整播放器畫面"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 迷你黑膠唱片旋轉展示 + 曲目名稱 */}
      <div className="flex items-center gap-3">
        {/* 迷你黑膠本體 (具有旋轉動畫) */}
        <div className="relative w-16 h-16 shrink-0">
          <div
            className={`w-full h-full rounded-full bg-zinc-950 p-1 shadow-lg border-2 border-zinc-800 flex items-center justify-center ${
              isPlaying ? 'animate-spin-slow' : ''
            }`}
            style={{ animationDuration: '4s' }}
          >
            {/* 黑膠同心紋路 */}
            <div className="w-full h-full rounded-full border border-zinc-700/40 flex items-center justify-center overflow-hidden">
              {currentSong?.coverUrl ? (
                <img
                  src={currentSong.coverUrl}
                  alt={currentSong.title}
                  className="w-8 h-8 rounded-full object-cover shadow"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-[10px]">
                  🎵
                </div>
              )}
            </div>
            {/* 中心軸孔 */}
            <div className="absolute w-2 h-2 rounded-full bg-zinc-900 border border-zinc-600" />
          </div>
        </div>

        {/* 歌曲資訊 */}
        <div className="min-w-0 flex-1">
          <p
            className="text-xs font-bold text-white truncate"
            title={currentSong?.title || '未在播放'}
          >
            {currentSong?.title || '未在播放'}
          </p>
          <p
            className="text-[10px] text-zinc-400 truncate mt-0.5"
            title={currentSong?.artist || '請選擇歌曲'}
          >
            {currentSong?.artist || '請選擇歌曲'}
          </p>

          {/* 迷你進度條 */}
          <div className="w-full bg-zinc-800 h-1 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 控制按鈕列 */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/80">
        {/* 循環模式切換按鈕 */}
        <button
          onClick={onTogglePlaybackMode}
          className={`p-1.5 rounded-lg text-xs transition ${
            playbackMode === 'loop-one'
              ? 'text-amber-400 bg-amber-400/10'
              : playbackMode === 'stop-after'
              ? 'text-rose-400 bg-rose-400/10'
              : 'text-indigo-400 bg-indigo-500/10'
          }`}
          title={
            playbackMode === 'loop-one'
              ? '單曲循環中 (點擊切換)'
              : playbackMode === 'stop-after'
              ? '播完此曲即停止 (點擊切換)'
              : '自動播放下一首 (點擊切換)'
          }
        >
          {playbackMode === 'loop-one' ? '🔂' : playbackMode === 'stop-after' ? '⏹️' : '🔁'}
        </button>

        {/* 上一首、播放/暫停、下一首 */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            className="p-1 text-zinc-400 hover:text-white transition"
            title="上一首"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            onClick={onTogglePlay}
            className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95 transition"
            title="播放/暫停"
          >
            {isPlaying ? (
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            )}
          </button>

          <button
            onClick={onNext}
            className="p-1 text-zinc-400 hover:text-white transition"
            title="下一首"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        {/* 音量控制 */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleMute}
            className="p-1 text-zinc-400 hover:text-white transition"
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
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-14 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            title={`音量: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>
      </div>
    </div>
  );
};
