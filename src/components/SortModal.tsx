import React from 'react';
import type { SortOption } from '../types/song';

interface SortModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSort: SortOption;
  onSelectSort: (sort: SortOption) => void;
}

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'manual', label: '手動' },
  { id: 'date-newest', label: '新增日期 (最新)' },
  { id: 'date-oldest', label: '新增日期 (最舊)' },
  { id: 'popular', label: '最熱門' },
  { id: 'release-newest', label: '發布日期 (最新)' },
  { id: 'release-oldest', label: '發布日期 (最舊)' },
];

export const SortModal: React.FC<SortModalProps> = ({
  isOpen,
  onClose,
  currentSort,
  onSelectSort,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* 底部升起卡片（仿使用者上傳的手機/桌面現代選單） */}
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 text-zinc-900 dark:text-zinc-100 space-y-2 animate-slideUp">
        {/* 頂部把手條 */}
        <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4" />

        {/* 選項列表 */}
        <div className="space-y-1">
          {SORT_OPTIONS.map((opt) => {
            const isSelected = currentSort === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onSelectSort(opt.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between py-3.5 px-3 rounded-2xl text-left text-sm font-medium transition ${
                  isSelected
                    ? 'font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <span className="text-base text-indigo-600 dark:text-indigo-400 font-bold">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 分隔線與取消按鈕 */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="w-full flex items-center gap-2 py-3 px-3 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition rounded-xl"
          >
            <span className="text-base">✕</span>
            <span>取消</span>
          </button>
        </div>
      </div>
    </div>
  );
};
