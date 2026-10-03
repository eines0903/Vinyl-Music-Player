export type TopButtonId =
  | 'install'
  | 'mini'
  | 'feedback'
  | 'youtube'
  | 'upload'
  | 'report'
  | 'sort'
  | 'shuffle';

export interface TopButtonItemConfig {
  id: TopButtonId;
  label: string;
  icon: string;
  enabled: boolean;
  colorTheme?: string; // custom color class or override
}

export type ButtonShape = 'pill' | 'squircle' | 'compact';
export type ButtonStyleTheme = 'vibrant' | 'minimal' | 'neon' | 'amber';

export interface ButtonBarConfig {
  buttons: TopButtonItemConfig[];
  shape: ButtonShape;
  styleTheme: ButtonStyleTheme;
}

export interface ShortcutKeyConfig {
  togglePlay: string; // e.g. "Space"
  nextTrack: string;  // e.g. "ArrowRight"
  prevTrack: string;  // e.g. "ArrowLeft"
  toggleMini: string; // e.g. "KeyM"
}

export const DEFAULT_TOP_BUTTONS: TopButtonItemConfig[] = [
  { id: 'install', label: '安裝離線 App', icon: '📲', enabled: true },
  { id: 'mini', label: '桌面迷你黑膠', icon: '🗗', enabled: true },
  { id: 'feedback', label: '用戶回饋', icon: '💬', enabled: true },
  { id: 'youtube', label: '連接 YouTube', icon: '▶', enabled: true },
  { id: 'upload', label: '匯入多首 MP3', icon: '📁', enabled: true },
  { id: 'report', label: '聆聽報告', icon: '📊', enabled: false },
  { id: 'sort', label: '排序清單', icon: '⇅', enabled: false },
  { id: 'shuffle', label: '隨機播放', icon: '🔀', enabled: false },
];

export const DEFAULT_SHORTCUTS: ShortcutKeyConfig = {
  togglePlay: 'Space',
  nextTrack: 'ArrowRight',
  prevTrack: 'ArrowLeft',
  toggleMini: 'KeyM',
};
