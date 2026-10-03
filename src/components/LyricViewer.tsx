import React, { useEffect, useRef, useState } from 'react';
import type { LyricParseResult } from '../types/song';

interface LyricViewerProps {
  lyricData: LyricParseResult;
  currentTime: number;
  accentTextClass: string;
  onClick?: () => void;
}

export const LyricViewer: React.FC<LyricViewerProps> = ({
  lyricData,
  currentTime,
  accentTextClass,
  onClick,
}) => {
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lyricData.isSynced || !lyricData.syncedLines.length) return;

    let idx = -1;
    for (let i = lyricData.syncedLines.length - 1; i >= 0; i--) {
      if (lyricData.syncedLines[i].time <= currentTime) {
        idx = i;
        break;
      }
    }

    if (idx !== -1 && idx !== currentLineIndex) {
      setCurrentLineIndex(idx);
      const el = containerRef.current?.children[idx] as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, lyricData, currentLineIndex]);

  return (
    <div
      onClick={onClick}
      className={`w-full h-24 bg-zinc-950/60 rounded-2xl px-4 py-2 overflow-hidden border border-zinc-800/80 relative shrink-0 ${
        onClick ? 'cursor-pointer hover:border-zinc-700/80 transition group' : ''
      }`}
      title={onClick ? '點擊搜尋、編輯或自訂歌詞' : undefined}
      style={{
        maskImage:
          'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
      }}
    >
      {lyricData.isSynced ? (
        <div
          ref={containerRef}
          className="h-full overflow-y-auto no-scrollbar space-y-2.5 text-center py-6"
        >
          {lyricData.syncedLines.map((line, idx) => (
            <p
              key={idx}
              className={`text-xs sm:text-sm transition-all duration-300 ${
                idx === currentLineIndex
                  ? `${accentTextClass} font-bold scale-105 opacity-100`
                  : 'text-zinc-500 opacity-40 scale-95'
              }`}
            >
              {line.text}
            </p>
          ))}
        </div>
      ) : lyricData.plainLines.length > 0 ? (
        <div className="h-full flex flex-col items-center justify-center">
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1 shrink-0">
            純文字歌詞（未同步）
          </span>
          <div className="overflow-y-auto no-scrollbar space-y-1 text-center text-xs text-zinc-400 max-h-16">
            {lyricData.plainLines.map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs gap-1 group-hover:text-zinc-300 transition">
          <span>暫無歌詞資訊</span>
          <span className="text-[10px] text-indigo-400/80 font-medium">
            點擊此處線上搜尋或貼上歌詞 🔍
          </span>
        </div>
      )}
    </div>
  );
};
