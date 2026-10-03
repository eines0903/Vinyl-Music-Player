import React from 'react';

interface VinylRecordProps {
  coverUrl: string;
  title: string;
  isPlaying: boolean;
  onEditCover?: () => void;
}

export const VinylRecord: React.FC<VinylRecordProps> = ({
  coverUrl,
  title,
  isPlaying,
  onEditCover,
}) => {
  return (
    <div className="relative w-64 h-64 md:w-72 md:h-72 shrink-0 flex items-center justify-center">
      {/* 唱針 (Tonearm) */}
      <div
        className="absolute top-0 right-6 w-6 h-28 origin-top-right transition-transform duration-700 z-20 pointer-events-none"
        style={{
          transform: isPlaying ? 'rotate(18deg)' : 'rotate(-25deg)',
        }}
      >
        <div className="w-2 h-20 bg-zinc-400 rounded-sm ml-auto shadow-md" />
        <div className="w-5 h-8 bg-zinc-200 rounded-sm ml-auto shadow-lg -mt-1" />
      </div>

      {/* 黑膠唱片盤身 */}
      <div
        className="relative w-full h-full rounded-full border-4 border-zinc-800 shadow-[0_0_40px_rgba(0,0,0,0.8)] flex items-center justify-center animate-vinyl select-none"
        style={{
          background: `radial-gradient(circle, #09090b 28%, #18181b 30%, #09090b 45%, #27272a 46%, #09090b 60%, #18181b 61%, #09090b 80%)`,
          animationPlayState: isPlaying ? 'running' : 'paused',
        }}
      >
        {/* 反光效果 */}
        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.08)_45deg,transparent_90deg,rgba(255,255,255,0.08)_225deg,transparent_270deg)] pointer-events-none" />

        {/* 唱片中心封面與軸孔 */}
        <div
          onClick={onEditCover}
          className="group relative w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-black z-10 flex items-center justify-center shadow-inner cursor-pointer"
          title="點擊自訂或搜尋此歌曲封面"
        >
          <img
            src={
              coverUrl ||
              'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80'
            }
            alt={title}
            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80';
            }}
          />

          {/* 滑鼠懸停顯示更換封面提示 */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition text-[10px] text-white font-medium">
            <span>📷</span>
            <span>換封面</span>
          </div>

          <div className="absolute w-4 h-4 bg-zinc-950 border border-zinc-700 rounded-full shadow-inner pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
