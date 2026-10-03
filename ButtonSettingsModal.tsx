import React, { useState, useEffect } from 'react';
import type {
  ButtonBarConfig,
  ShortcutKeyConfig,
  TopButtonItemConfig,
  ButtonShape,
  ButtonStyleTheme,
} from '../types/customButtons';
import { DEFAULT_TOP_BUTTONS, DEFAULT_SHORTCUTS } from '../types/customButtons';

interface ButtonSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ButtonBarConfig;
  shortcuts: ShortcutKeyConfig;
  onSaveConfig: (config: ButtonBarConfig) => void;
  onSaveShortcuts: (shortcuts: ShortcutKeyConfig) => void;
  onResetAll: () => void;
}

const THEME_OPTIONS: { id: ButtonStyleTheme; label: string; desc: string; icon: string }[] = [
  { id: 'vibrant', label: '經典繽紛', desc: '各功能獨立高辨識色彩（推薦）', icon: '🌈' },
  { id: 'minimal', label: '極簡黑透', desc: '純淨毛玻璃低調質感', icon: '🖤' },
  { id: 'amber', label: '復古琥珀金', desc: '懷舊實體黑膠唱盤金色系', icon: '🌟' },
  { id: 'neon', label: '霓虹電光', desc: '前衛潮流漸層光暈', icon: '⚡' },
];

const SHAPE_OPTIONS: { id: ButtonShape; label: string; desc: string; icon: string }[] = [
  { id: 'pill', label: '圓角膠囊', desc: '圓弧包覆（截圖同款）', icon: '💊' },
  { id: 'squircle', label: '圓潤卡片', desc: '柔和直角弧線', icon: '🔲' },
  { id: 'compact', label: '俐落方角', desc: '現代簡約俐落', icon: '⏹️' },
];

export const ButtonSettingsModal: React.FC<ButtonSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  shortcuts,
  onSaveConfig,
  onSaveShortcuts,
  onResetAll,
}) => {
  const [activeTab, setActiveTab] = useState<'buttons' | 'shortcuts'>('buttons');

  // 本地工作狀態
  const [tempButtons, setTempButtons] = useState<TopButtonItemConfig[]>(config.buttons);
  const [tempShape, setTempShape] = useState<ButtonShape>(config.shape);
  const [tempTheme, setTempTheme] = useState<ButtonStyleTheme>(config.styleTheme);
  const [tempShortcuts, setTempShortcuts] = useState<ShortcutKeyConfig>(shortcuts);

  // 快捷鍵錄製中狀態
  const [recordingAction, setRecordingAction] = useState<keyof ShortcutKeyConfig | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTempButtons(config.buttons);
      setTempShape(config.shape);
      setTempTheme(config.styleTheme);
      setTempShortcuts(shortcuts);
      setRecordingAction(null);
    }
  }, [isOpen, config, shortcuts]);

  // 鍵盤 Esc 關閉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (recordingAction) {
        e.preventDefault();
        e.stopPropagation();
        setTempShortcuts((prev) => ({
          ...prev,
          [recordingAction]: e.code,
        }));
        setRecordingAction(null);
        return;
      }

      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, recordingAction, onClose]);

  // 上移/下移按鈕順序
  const moveButton = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= tempButtons.length) return;
    const updated = [...tempButtons];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIdx, 0, moved);
    setTempButtons(updated);
  };

  // 切換啟用/隱藏
  const toggleButtonEnabled = (id: string) => {
    setTempButtons((prev) =>
      prev.map((btn) => (btn.id === id ? { ...btn, enabled: !btn.enabled } : btn))
    );
  };

  // 修改按鍵自訂標籤
  const updateButtonLabel = (id: string, newLabel: string) => {
    setTempButtons((prev) =>
      prev.map((btn) => (btn.id === id ? { ...btn, label: newLabel } : btn))
    );
  };

  // 重置單顆按鍵預設名
  const resetButtonLabel = (id: string) => {
    const def = DEFAULT_TOP_BUTTONS.find((b) => b.id === id);
    if (def) updateButtonLabel(id, def.label);
  };

  const handleSaveAndApply = () => {
    onSaveConfig({
      buttons: tempButtons,
      shape: tempShape,
      styleTheme: tempTheme,
    });
    onSaveShortcuts(tempShortcuts);
    onClose();
  };

  const handleResetToDefault = () => {
    if (window.confirm('確定要將所有按鍵外觀、排列順序與快捷鍵全部恢復為預設設定嗎？')) {
      onResetAll();
      setTempButtons(DEFAULT_TOP_BUTTONS);
      setTempShape('pill');
      setTempTheme('vibrant');
      setTempShortcuts(DEFAULT_SHORTCUTS);
    }
  };

  // 樣式類別輔助
  const getShapeClass = (shape: ButtonShape) => {
    if (shape === 'pill') return 'rounded-full';
    if (shape === 'squircle') return 'rounded-2xl';
    return 'rounded-xl';
  };

  const getThemeClass = (theme: ButtonStyleTheme, btnId: string) => {
    if (theme === 'minimal') {
      return 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700';
    }
    if (theme === 'amber') {
      return 'bg-gradient-to-r from-amber-600/90 to-amber-700 text-white border border-amber-500/60 shadow-amber-500/20';
    }
    if (theme === 'neon') {
      return 'bg-zinc-900 border border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.25)] hover:border-pink-400 hover:text-pink-300';
    }

    // vibrant 經典繽紛配色 (同截圖)
    switch (btnId) {
      case 'install':
        return 'bg-indigo-600 hover:bg-indigo-500 text-white';
      case 'mini':
        return 'bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 text-zinc-200';
      case 'feedback':
        return 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40';
      case 'youtube':
        return 'bg-red-600/90 hover:bg-red-500 text-white';
      case 'upload':
        return 'bg-indigo-600 hover:bg-indigo-500 text-white';
      case 'report':
        return 'bg-emerald-600/90 hover:bg-emerald-500 text-white';
      case 'sort':
        return 'bg-purple-600/90 hover:bg-purple-500 text-white';
      case 'shuffle':
        return 'bg-pink-600/90 hover:bg-pink-500 text-white';
      default:
        return 'bg-zinc-800 text-white';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* 頂部標題 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚙️</span>
            <div>
              <h2 className="text-lg font-bold tracking-wide">按鍵與功能個人化設定</h2>
              <p className="text-[11px] text-zinc-400">
                自由調整按鍵順序、自訂文字、更換形狀風格與鍵盤快捷鍵
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition"
            title="關閉 (Esc)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 即時視覺效果預覽列 */}
        <div className="bg-black/40 border-b border-zinc-800/80 px-6 py-3">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>👁️</span>
            <span>即時按鍵排版預覽：</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto py-1">
            {tempButtons.filter((b) => b.enabled).length === 0 ? (
              <span className="text-xs text-zinc-500 italic">尚未勾選啟用任何按鍵</span>
            ) : (
              tempButtons
                .filter((b) => b.enabled)
                .map((btn) => (
                  <div
                    key={btn.id}
                    className={`px-3.5 py-1.5 text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all ${getShapeClass(
                      tempShape
                    )} ${getThemeClass(tempTheme, btn.id)}`}
                  >
                    <span>{btn.icon}</span>
                    <span>{btn.label}</span>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* 標籤導覽 */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-6 pt-2">
          <button
            onClick={() => setActiveTab('buttons')}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'buttons'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>🎛️ 頂部按鍵排列與外觀</span>
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'shortcuts'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>⌨️ 鍵盤快捷鍵自訂</span>
          </button>
        </div>

        {/* 標籤內容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'buttons' ? (
            <div className="space-y-6">
              {/* 風格主題選擇 */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">
                  1. 選擇按鍵風格配色
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {THEME_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTempTheme(t.id)}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                        tempTheme === t.id
                          ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400/50'
                          : 'bg-zinc-800/60 border-zinc-700/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 mt-1">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 按鈕形狀選擇 */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-2">
                  2. 選擇按鍵圓角形狀
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {SHAPE_OPTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setTempShape(s.id)}
                      className={`p-3 rounded-2xl border text-left transition ${
                        tempShape === s.id
                          ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400/50'
                          : 'bg-zinc-800/60 border-zinc-700/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span>{s.icon}</span>
                        <span>{s.label}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 mt-0.5 block">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 按鍵排序與文字清單 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-zinc-300">
                    3. 自訂按鍵順序、啟用與名稱 (點擊 ⬆️ / ⬇️ 移動次序)
                  </label>
                  <span className="text-[10px] text-zinc-500">已啟用 {tempButtons.filter(b => b.enabled).length} 個</span>
                </div>

                <div className="space-y-2">
                  {tempButtons.map((btn, index) => (
                    <div
                      key={btn.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                        btn.enabled
                          ? 'bg-zinc-800/60 border-zinc-700 text-white'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 opacity-60'
                      }`}
                    >
                      {/* 勾選啟用 + 圖示 */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={btn.enabled}
                          onChange={() => toggleButtonEnabled(btn.id)}
                          className="w-4 h-4 rounded text-amber-500 bg-zinc-700 border-zinc-600 focus:ring-amber-400 cursor-pointer"
                          title="啟用或隱藏此按鍵"
                        />
                        <span className="text-lg shrink-0">{btn.icon}</span>
                        {/* 名稱輸入框 */}
                        <input
                          type="text"
                          value={btn.label}
                          onChange={(e) => updateButtonLabel(btn.id, e.target.value)}
                          maxLength={16}
                          className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400 w-32 sm:w-44"
                          title="點擊修改按鈕顯示文字"
                        />
                      </div>

                      {/* 順序移動控制列 */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => resetButtonLabel(btn.id)}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-1 hover:bg-zinc-800 rounded transition"
                          title="恢復預設文字"
                        >
                          重設名
                        </button>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveButton(index, 'up')}
                          className="p-1 rounded-lg hover:bg-zinc-700 disabled:opacity-20 text-zinc-400 hover:text-white transition"
                          title="向左/向上移動 (排在前面)"
                        >
                          ⬆️
                        </button>
                        <button
                          type="button"
                          disabled={index === tempButtons.length - 1}
                          onClick={() => moveButton(index, 'down')}
                          className="p-1 rounded-lg hover:bg-zinc-700 disabled:opacity-20 text-zinc-400 hover:text-white transition"
                          title="向右/向下移動 (排在後面)"
                        >
                          ⬇️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* 鍵盤快捷鍵自訂 */
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>💡</span>
                  <span>如何自訂快捷鍵？</span>
                </p>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  點擊右側的「變更按鍵」按鈕，接著按下鍵盤上的任意按鍵，即可將該操作綁定為您專屬的鍵位！
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  { key: 'togglePlay' as const, label: '播放 / 暫停切換', desc: '控制黑膠唱片旋轉與音樂起停' },
                  { key: 'nextTrack' as const, label: '切換下一首歌曲', desc: '跳至播放清單中的下一首' },
                  { key: 'prevTrack' as const, label: '切換上一首歌曲', desc: '跳至播放清單中的上一首' },
                  { key: 'toggleMini' as const, label: '開關桌面迷你黑膠', desc: '切換桌面寵物懸浮黑膠小視窗' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="p-3.5 bg-zinc-800/60 border border-zinc-700/80 rounded-2xl flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{item.label}</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{item.desc}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 bg-zinc-950 border border-zinc-700 text-amber-400 font-mono font-bold text-xs rounded-xl shadow-inner min-w-[70px] text-center">
                        {recordingAction === item.key ? '請按按鍵...' : tempShortcuts[item.key] || '無'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRecordingAction(item.key)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                          recordingAction === item.key
                            ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
                            : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-600 text-zinc-200'
                        }`}
                      >
                        {recordingAction === item.key ? '聆聽中...' : '變更按鍵'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部動作列 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950/60">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-xs text-zinc-400 hover:text-red-400 transition flex items-center gap-1.5"
            title="全部恢復原廠預設狀態"
          >
            <span>🔄</span>
            <span>恢復所有預設</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black font-bold text-xs rounded-xl shadow-lg transition"
            >
              儲存並套用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
