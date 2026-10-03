import { useEffect, useRef } from 'react';
import type { ShortcutKeyConfig } from '../types/customButtons';
import { DEFAULT_SHORTCUTS } from '../types/customButtons';

interface ShortcutHandlers {
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleMini?: () => void;
  customShortcuts?: ShortcutKeyConfig;
}

export const useKeyboardShortcuts = ({
  onTogglePlay,
  onNext,
  onPrev,
  onToggleMini,
  customShortcuts = DEFAULT_SHORTCUTS,
}: ShortcutHandlers) => {
  const handlersRef = useRef({ onTogglePlay, onNext, onPrev, onToggleMini });
  const shortcutsRef = useRef(customShortcuts);

  useEffect(() => {
    handlersRef.current = { onTogglePlay, onNext, onPrev, onToggleMini };
    shortcutsRef.current = customShortcuts;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;

      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'textbox')
      ) {
        return;
      }

      const sc = shortcutsRef.current;
      if (e.code === sc.togglePlay) {
        e.preventDefault();
        handlersRef.current.onTogglePlay();
      } else if (e.code === sc.nextTrack) {
        e.preventDefault();
        handlersRef.current.onNext();
      } else if (e.code === sc.prevTrack) {
        e.preventDefault();
        handlersRef.current.onPrev();
      } else if (sc.toggleMini && e.code === sc.toggleMini) {
        e.preventDefault();
        handlersRef.current.onToggleMini?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};

