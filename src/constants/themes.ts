export interface Theme {
  id: string;
  name: string;
  bgGradient: string;
  cardBg: string;
  accent: string;
  accentText: string;
}

export const THEMES: Theme[] = [
  {
    id: 'midnight',
    name: '午夜黑膠',
    bgGradient: 'from-zinc-950 via-neutral-900 to-black',
    cardBg: 'bg-zinc-900/80 border-zinc-800',
    accent: 'bg-indigo-600 hover:bg-indigo-500',
    accentText: 'text-indigo-400',
  },
  {
    id: 'sunset',
    name: '落日餘暉',
    bgGradient: 'from-amber-950 via-rose-950 to-neutral-950',
    cardBg: 'bg-stone-900/80 border-stone-800',
    accent: 'bg-amber-600 hover:bg-amber-500',
    accentText: 'text-amber-400',
  },
  {
    id: 'emerald',
    name: '極光深綠',
    bgGradient: 'from-emerald-950 via-teal-950 to-neutral-950',
    cardBg: 'bg-zinc-900/80 border-emerald-950',
    accent: 'bg-emerald-600 hover:bg-emerald-500',
    accentText: 'text-emerald-400',
  },
];
