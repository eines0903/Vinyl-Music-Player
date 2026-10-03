import { useEffect, useRef } from 'react';

interface ShortcutHandlers {
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const useKeyboardShortcuts = ({
  onTogglePlay,
  onNext,
  onPrev,
}: ShortcutHandlers) => {
  const handlersRef = useRef({ onTogglePlay, onNext, onPrev });

  useEffect(() => {
    handlersRef.current = { onTogglePlay, onNext, onPrev };
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

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlersRef.current.onTogglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handlersRef.current.onNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlersRef.current.onPrev();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
