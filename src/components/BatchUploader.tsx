import React, { useRef, useState } from 'react';
import type { SongItem } from '../types/song';
import { extractMetadataFromMP3 } from '../utils/metadataParser';
import { saveSongToDB } from '../utils/indexedDb';

interface BatchUploaderProps {
  onSongsAdded: (songs: SongItem[]) => void;
}

export const BatchUploader: React.FC<BatchUploaderProps> = ({ onSongsAdded }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const parsed: SongItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.includes('audio') && !file.name.toLowerCase().endsWith('.mp3')) {
        continue;
      }

      try {
        const meta = await extractMetadataFromMP3(file);
        const song: SongItem = {
          id: `${file.name}-${Date.now()}-${i}`,
          title: meta.title,
          artist: meta.artist,
          audioUrl: URL.createObjectURL(file),
          coverUrl: meta.coverUrl,
          lrcContent: meta.lyrics,
        };

        // 持久化儲存到本機 IndexedDB 資料庫
        await saveSongToDB(song, file);
        parsed.push(song);
      } catch (err) {
        console.error(`解析失敗: ${file.name}`, err);
      }
    }

    onSongsAdded(parsed);
    setIsProcessing(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <input
        type="file"
        multiple
        accept="audio/*,.mp3"
        ref={inputRef}
        onChange={handleFiles}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isProcessing}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition shadow-md flex items-center gap-1.5"
      >
        <span>📁</span>
        <span>{isProcessing ? '儲存解析中...' : '匯入多首 MP3'}</span>
      </button>
    </div>
  );
};
