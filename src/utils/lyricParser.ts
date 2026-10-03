import type { LyricParseResult, SyncedLine } from '../types/song';

export const parseLyrics = (rawText: string): LyricParseResult => {
  if (!rawText || !rawText.trim()) {
    return { isSynced: false, syncedLines: [], plainLines: [] };
  }

  const rawLines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
  const synced: SyncedLine[] = [];

  for (const line of rawLines) {
    const matches = Array.from(line.matchAll(timeRegex));
    if (matches.length > 0) {
      const text = line.replace(timeRegex, '').trim();
      if (text) {
        for (const match of matches) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const msStr = match[3] ? match[3].padEnd(3, '0').slice(0, 3) : '0';
          const milliseconds = parseInt(msStr, 10) / 1000;
          const totalTime = minutes * 60 + seconds + milliseconds;
          synced.push({ time: totalTime, text });
        }
      }
    }
  }

  if (synced.length > 0) {
    return {
      isSynced: true,
      syncedLines: synced.sort((a, b) => a.time - b.time),
      plainLines: [],
    };
  }

  const plain = rawLines.filter((l) => !/^\[[a-zA-Z]+:.*\]$/.test(l));
  return {
    isSynced: false,
    syncedLines: [],
    plainLines: plain,
  };
};
