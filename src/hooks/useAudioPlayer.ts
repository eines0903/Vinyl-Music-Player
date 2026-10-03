import { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';
import { extractYouTubeId } from '../utils/coverSearch';
import type { PlaybackMode } from '../types/song';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const useAudioPlayer = (src: string, onEnded?: () => void) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const isYtReadyRef = useRef<boolean>(false);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);

  // 音量與靜音控制 (0 ~ 1)
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // 播放循環模式：'loop-all' | 'loop-one' | 'stop-after'
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('loop-all');
  const playbackModeRef = useRef<PlaybackMode>(playbackMode);
  useEffect(() => {
    playbackModeRef.current = playbackMode;
  }, [playbackMode]);

  // 保持播放意圖，切換曲目時維持流暢連貫播放
  const shouldPlayRef = useRef<boolean>(false);

  // 紀錄前次真實播放來源，避免每次 Re-render 誤觸發暫停與重播中斷
  const lastSrcRef = useRef<string | null>(null);

  // 將 onEnded 保持在 ref 中，避免依賴項頻繁變更引發 Effect 重新執行
  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  const ytId = extractYouTubeId(src);
  const isYouTube = Boolean(ytId);

  useEffect(() => {
    shouldPlayRef.current = isPlaying;
  }, [isPlaying]);

  // 單曲循環 / 停止 / 自動切換下一首
  const handleTrackEnded = useCallback(() => {
    const mode = playbackModeRef.current;
    if (mode === 'loop-one') {
      // 循環單曲
      if (isYouTube) {
        if (ytPlayerRef.current && isYtReadyRef.current) {
          try {
            ytPlayerRef.current.seekTo(0, true);
            ytPlayerRef.current.playVideo();
          } catch {}
        }
      } else {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      }
      setIsPlaying(true);
      shouldPlayRef.current = true;
    } else if (mode === 'stop-after') {
      // 播放完本首即停止
      setIsPlaying(false);
      shouldPlayRef.current = false;
      setCurrentTime(0);
    } else {
      // 自動播放下一首 / 全部循環 (loop-all)
      setIsPlaying(false);
      shouldPlayRef.current = true;
      if (onEndedRef.current) {
        onEndedRef.current();
      }
    }
  }, [isYouTube]);

  // 音量調整
  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : clamped;
    }
    if (ytPlayerRef.current && isYtReadyRef.current) {
      try {
        ytPlayerRef.current.setVolume((isMuted ? 0 : clamped) * 100);
      } catch {}
    }
  }, [isMuted]);

  // 靜音切換
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.volume = next ? 0 : volume;
      }
      if (ytPlayerRef.current && isYtReadyRef.current) {
        try {
          ytPlayerRef.current.setVolume(next ? 0 : volume * 100);
        } catch {}
      }
      return next;
    });
  }, [volume]);

  // 1. 動態載入 YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }
  }, []);

  // 2. 初始化 YouTube 播放器實例
  const initYouTubePlayer = useCallback((videoId: string) => {
    const createOrLoad = () => {
      if (!document.getElementById('yt-player-container')) return;

      if (ytPlayerRef.current && isYtReadyRef.current) {
        try {
          if (shouldPlayRef.current) {
            ytPlayerRef.current.loadVideoById(videoId);
          } else {
            ytPlayerRef.current.cueVideoById(videoId);
          }
        } catch (e) {
          console.warn('YouTube 載入影片異常:', e);
        }
        return;
      }

      ytPlayerRef.current = new window.YT.Player('yt-player-container', {
        height: '1',
        width: '1',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          playsinline: 1,
        },
        events: {
          onReady: (event: any) => {
            isYtReadyRef.current = true;
            event.target.setVolume((isMuted ? 0 : volume) * 100);
            if (shouldPlayRef.current) {
              event.target.playVideo();
            }
          },
          onStateChange: (event: any) => {
            // 1: PLAYING, 2: PAUSED, 0: ENDED
            if (event.data === 1) {
              setIsPlaying(true);
              shouldPlayRef.current = true;
            } else if (event.data === 2) {
              // 僅在使用者主動暫停時才切換，避免換曲載入過程觸發短暫暫停導致中斷
              if (!shouldPlayRef.current) {
                setIsPlaying(false);
              }
            } else if (event.data === 0) {
              handleTrackEnded();
            }
          },
          onError: (err: any) => {
            console.error('YouTube 播放器錯誤:', err);
            setIsPlaying(false);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      createOrLoad();
    } else {
      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevReady) prevReady();
        createOrLoad();
      };
    }
  }, [handleTrackEnded, isMuted, volume]);

  // 3. 監聽曲目來源變化（嚴格比對真實 src，絕不因 re-render 誤叫 pause()）
  useEffect(() => {
    // 關鍵防線：若音訊來源未發生真實改變，絕對不重複觸發切歌、暫停與重置！
    if (lastSrcRef.current === src) {
      return;
    }
    lastSrcRef.current = src;

    setCurrentTime(0);
    setDuration(0);

    if (!src) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.removeAttribute('src');
      }
      if (ytPlayerRef.current && isYtReadyRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }
      setIsPlaying(false);
      return;
    }

    if (isYouTube && ytId) {
      // 立即停止並清空 HTML5 音訊，絕不讓前一首 MP3 殘留發聲
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.removeAttribute('src');
      }
      initYouTubePlayer(ytId);
    } else {
      // 立即停止 YouTube 串流，絕不讓 YouTube 在背景發聲
      if (ytPlayerRef.current && isYtReadyRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
          ytPlayerRef.current.stopVideo();
        } catch {}
      }

      // 切換至目標 MP3 檔案
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = src;

        if (shouldPlayRef.current) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
              })
              .catch((err) => {
                if (err.name === 'AbortError') return;
                console.warn('播放等待中:', err);
              });
          }
        }
      }
    }
  }, [src, isYouTube, ytId, initYouTubePlayer]);

  // 4. 定時同步 YouTube 播放進度
  useEffect(() => {
    if (!isYouTube) return;

    const interval = setInterval(() => {
      if (ytPlayerRef.current && isYtReadyRef.current && !isSeeking) {
        try {
          const curr = ytPlayerRef.current.getCurrentTime() || 0;
          const dur = ytPlayerRef.current.getDuration() || 0;
          setCurrentTime(curr);
          if (dur > 0) setDuration(dur);
        } catch {
          // ignore
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isYouTube, isSeeking]);

  // 5. 播放 / 暫停切換
  const togglePlay = () => {
    if (isYouTube) {
      if (!ytPlayerRef.current || !isYtReadyRef.current) return;
      try {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
          shouldPlayRef.current = false;
        } else {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          shouldPlayRef.current = true;
        }
      } catch (err) {
        console.error('YouTube 控制失敗:', err);
      }
    } else {
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        shouldPlayRef.current = false;
      } else {
        shouldPlayRef.current = true;
        if (!audioRef.current.src && src) {
          audioRef.current.src = src;
        }
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            if (err.name === 'AbortError') return;
            console.error('播放失敗 (Autoplay 限制):', err);
            setIsPlaying(false);
            shouldPlayRef.current = false;
          });
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (!isYouTube && audioRef.current) {
      setDuration(audioRef.current.duration || 0);
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  };

  const handleTimeUpdate = () => {
    if (!isYouTube && audioRef.current && !isSeeking) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeekChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIsSeeking(true);
    setCurrentTime(Number(e.target.value));
  };

  const handleSeekCommit = () => {
    if (isYouTube) {
      if (ytPlayerRef.current && isYtReadyRef.current) {
        try {
          ytPlayerRef.current.seekTo(currentTime, true);
        } catch (e) {
          console.warn('YouTube seekTo 失敗:', e);
        }
      }
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = currentTime;
      }
    }
    setIsSeeking(false);
  };

  const startPlayback = useCallback(() => {
    shouldPlayRef.current = true;
  }, []);

  return {
    audioRef,
    isYouTube,
    isPlaying,
    currentTime,
    duration,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    playbackMode,
    setPlaybackMode,
    handleTrackEnded,
    togglePlay,
    startPlayback,
    handleLoadedMetadata,
    handleTimeUpdate,
    handleSeekChange,
    handleSeekCommit,
  };
};
