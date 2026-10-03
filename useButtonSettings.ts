import { useState } from 'react';
import {
  type ButtonBarConfig,
  type ShortcutKeyConfig,
  type TopButtonItemConfig,
  DEFAULT_TOP_BUTTONS,
  DEFAULT_SHORTCUTS,
} from '../types/customButtons';

const BUTTON_CONFIG_KEY = 'vinyl_player_button_bar_config_v1';
const SHORTCUTS_KEY = 'vinyl_player_shortcuts_config_v1';

export function useButtonSettings() {
  const [buttonBarConfig, setButtonBarConfig] = useState<ButtonBarConfig>(() => {
    try {
      const saved = localStorage.getItem(BUTTON_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 合併預設與既有設定，確保未來新增按鍵時不丟失
        const existingIds = new Set(parsed.buttons?.map((b: TopButtonItemConfig) => b.id));
        const missingDefaults = DEFAULT_TOP_BUTTONS.filter((b) => !existingIds.has(b.id));
        return {
          buttons: [...(parsed.buttons || DEFAULT_TOP_BUTTONS), ...missingDefaults],
          shape: parsed.shape || 'pill',
          styleTheme: parsed.styleTheme || 'vibrant',
        };
      }
    } catch (e) {
      console.error('Failed to load button config:', e);
    }
    return {
      buttons: DEFAULT_TOP_BUTTONS,
      shape: 'pill',
      styleTheme: 'vibrant',
    };
  });

  const [shortcuts, setShortcuts] = useState<ShortcutKeyConfig>(() => {
    try {
      const saved = localStorage.getItem(SHORTCUTS_KEY);
      if (saved) return { ...DEFAULT_SHORTCUTS, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Failed to load shortcuts:', e);
    }
    return DEFAULT_SHORTCUTS;
  });

  // 保存設定
  const saveButtonBarConfig = (newConfig: ButtonBarConfig) => {
    setButtonBarConfig(newConfig);
    localStorage.setItem(BUTTON_CONFIG_KEY, JSON.stringify(newConfig));
  };

  const saveShortcuts = (newShortcuts: ShortcutKeyConfig) => {
    setShortcuts(newShortcuts);
    localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(newShortcuts));
  };

  const resetAllSettings = () => {
    const defaultConf: ButtonBarConfig = {
      buttons: DEFAULT_TOP_BUTTONS,
      shape: 'pill',
      styleTheme: 'vibrant',
    };
    setButtonBarConfig(defaultConf);
    setShortcuts(DEFAULT_SHORTCUTS);
    localStorage.removeItem(BUTTON_CONFIG_KEY);
    localStorage.removeItem(SHORTCUTS_KEY);
  };

  return {
    buttonBarConfig,
    shortcuts,
    saveButtonBarConfig,
    saveShortcuts,
    resetAllSettings,
  };
}
