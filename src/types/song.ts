export interface SongItem {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl: string;
  lrcContent: string;
  addedAt?: number;
  playCount?: number;
  lastPlayedAt?: number;
  releaseDate?: string;
}

export interface SyncedLine {
  time: number;
  text: string;
}

export interface LyricParseResult {
  isSynced: boolean;
  syncedLines: SyncedLine[];
  plainLines: string[];
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
  isSystem?: boolean; // 例如：「最近一個月最愛」
}

export type PlaybackMode = 'loop-all' | 'loop-one' | 'stop-after';

export type SortOption =
  | 'manual'
  | 'date-newest'
  | 'date-oldest'
  | 'popular'
  | 'release-newest'
  | 'release-oldest';
