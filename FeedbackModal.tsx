import React, { useState, useEffect, useMemo } from 'react';
import type { FeedbackItem, FeedbackType } from '../types/feedback';
import {
  saveFeedbackToDB,
  loadAllFeedbackFromDB,
  deleteFeedbackFromDB,
  clearAllFeedbackFromDB,
} from '../utils/indexedDb';
import { exportFeedbackToCSV } from '../utils/feedbackExport';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEEDBACK_TYPES: { type: FeedbackType; label: string; icon: string }[] = [
  { type: 'feature', label: '功能建議', icon: '💡' },
  { type: 'bug', label: '問題回報', icon: '🐞' },
  { type: 'song', label: '歌曲/歌詞', icon: '🎵' },
  { type: 'other', label: '其他回饋', icon: '💬' },
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'submit' | 'list'>('submit');
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 表單欄位狀態
  const [type, setType] = useState<FeedbackType>('feature');
  const [rating, setRating] = useState<number>(5);
  const [userName, setUserName] = useState<string>('');
  const [contact, setContact] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 試算表月份篩選器
  const currentMonthKey = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  // 讀取回饋清單
  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const items = await loadAllFeedbackFromDB();
      setFeedbackList(items);
    } catch (err) {
      console.error('Failed to load feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFeedbacks();
      setSubmitSuccess(false);
    }
  }, [isOpen]);

  // 鍵盤 Esc 關閉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 提取所有有回饋的月份清單
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentMonthKey);
    feedbackList.forEach((item) => {
      if (item.monthKey) monthsSet.add(item.monthKey);
    });
    return Array.from(monthsSet).sort().reverse();
  }, [feedbackList, currentMonthKey]);

  // 根據月份篩選回饋
  const filteredFeedbacks = useMemo(() => {
    if (selectedMonth === 'all') return feedbackList;
    return feedbackList.filter((item) => item.monthKey === selectedMonth);
  }, [feedbackList, selectedMonth]);

  // 統計指標
  const stats = useMemo(() => {
    const target = selectedMonth === 'all' ? feedbackList : filteredFeedbacks;
    const total = target.length;
    const avgRating =
      total > 0 ? (target.reduce((acc, cur) => acc + cur.rating, 0) / total).toFixed(1) : '5.0';
    return { total, avgRating };
  }, [feedbackList, filteredFeedbacks, selectedMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('請填寫回饋或問題內容！');
      return;
    }

    try {
      setIsSubmitting(true);
      const now = new Date();
      const monthKey = now.toISOString().slice(0, 7); // "YYYY-MM"
      const typeObj = FEEDBACK_TYPES.find((t) => t.type === type);

      // 取得瀏覽器環境簡訊以輔助除錯
      const deviceInfo = `${navigator.userAgent.slice(0, 100)}`;

      const newFeedback: FeedbackItem = {
        id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
        monthKey,
        type,
        typeName: typeObj ? `${typeObj.icon} ${typeObj.label}` : '其他',
        rating,
        userName: userName.trim() || '熱心聽友',
        contact: contact.trim(),
        content: content.trim(),
        deviceInfo,
      };

      await saveFeedbackToDB(newFeedback);
      await fetchFeedbacks();

      setContent('');
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setActiveTab('list');
      }, 1500);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      alert('提交失敗，請稍後再試！');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('確定要刪除這筆回饋嗎？')) {
      await deleteFeedbackFromDB(id);
      await fetchFeedbacks();
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('確定要清空所有的用戶回饋嗎？此動作無法復原。')) {
      await clearAllFeedbackFromDB();
      await fetchFeedbacks();
    }
  };

  const handleExportSpreadsheet = () => {
    exportFeedbackToCSV(feedbackList, selectedMonth);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* 頂部標頭列 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <h2 className="text-lg font-bold tracking-wide">用戶回饋與問題回報</h2>
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

        {/* 標籤切換列 */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-6 pt-2">
          <button
            onClick={() => setActiveTab('submit')}
            className={`py-3 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-2 ${
              activeTab === 'submit'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>✍️ 填寫回饋問題</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('list');
              fetchFeedbacks();
            }}
            className={`py-3 px-4 font-semibold text-sm border-b-2 transition flex items-center gap-2 ${
              activeTab === 'list'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>📊 回饋管理與試算表匯出</span>
            {feedbackList.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                {feedbackList.length}
              </span>
            )}
          </button>
        </div>

        {/* 標籤內容展示區 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'submit' ? (
            /* 填寫回饋表單 */
            <form onSubmit={handleSubmit} className="space-y-5">
              {submitSuccess ? (
                <div className="p-8 text-center bg-emerald-500/10 border border-emerald-500/30 rounded-2xl animate-fade-in space-y-3">
                  <div className="text-4xl">🎉</div>
                  <h3 className="text-lg font-bold text-emerald-400">感謝您的寶貴回饋！</h3>
                  <p className="text-xs text-zinc-400">已成功保存至系統資料庫，正在前往回饋清單與試算表匯出頁面...</p>
                </div>
              ) : (
                <>
                  {/* 回饋類型選擇 */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-2">回饋類型</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {FEEDBACK_TYPES.map((t) => (
                        <button
                          key={t.type}
                          type="button"
                          onClick={() => setType(t.type)}
                          className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                            type === t.type
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                              : 'bg-zinc-800/60 border-zinc-700/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                          }`}
                        >
                          <span>{t.icon}</span>
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 整體滿意度評分 */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      播放器使用體驗評分
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="text-2xl transition hover:scale-125 focus:outline-none"
                        >
                          {star <= rating ? '⭐' : '☆'}
                        </button>
                      ))}
                      <span className="text-xs text-amber-400 font-semibold ml-2">
                        {rating === 5 && '非常滿意！'}
                        {rating === 4 && '挺不錯的'}
                        {rating === 3 && '一般，有待改進'}
                        {rating === 2 && '遇到問題需改進'}
                        {rating === 1 && '體驗不佳'}
                      </span>
                    </div>
                  </div>

                  {/* 稱呼與聯絡方式 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        您的暱稱 / 稱呼 <span className="text-zinc-500">(選填)</span>
                      </label>
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="例如：小萱、聽歌愛好者"
                        className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                        maxLength={20}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        聯絡方式 / Email <span className="text-zinc-500">(選填)</span>
                      </label>
                      <input
                        type="text"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="方便後續問題跟進回覆"
                        className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                        maxLength={50}
                      />
                    </div>
                  </div>

                  {/* 回饋內容 */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      問題描述或功能建議 <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      required
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={4}
                      placeholder="請具體說明您遇到的問題、操作情境，或期望新增的功能..."
                      className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
                      maxLength={1000}
                    />
                    <div className="flex justify-end text-[10px] text-zinc-500 mt-1">
                      {content.length}/1000 字
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black font-bold text-sm rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <span>正在送出...</span>
                      ) : (
                        <>
                          <span>🚀</span>
                          <span>送出寶貴回饋</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          ) : (
            /* 回饋管理與試算表匯出面板 */
            <div className="space-y-6">
              {/* 頂部月度控制與匯出區 */}
              <div className="bg-zinc-800/60 border border-zinc-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="w-full sm:w-auto">
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    📅 選擇匯出與檢視月份：
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full sm:w-48 bg-zinc-900 border border-zinc-700 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-amber-400"
                  >
                    <option value="all">🌟 全部月份 (全部共 {feedbackList.length} 則)</option>
                    {availableMonths.map((m) => {
                      const count = feedbackList.filter((fb) => fb.monthKey === m).length;
                      return (
                        <option key={m} value={m}>
                          {m} ({count} 則回饋)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 試算表匯出按鈕 */}
                <div className="w-full sm:w-auto flex items-center gap-2">
                  <button
                    onClick={handleExportSpreadsheet}
                    disabled={filteredFeedbacks.length === 0}
                    className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
                    title="匯出為 Excel / Google Sheets 相容之 CSV 試算表 (UTF-8 BOM 繁體中文無亂碼)"
                  >
                    <span>📊</span>
                    <span>匯出該月試算表 (.csv / Excel)</span>
                  </button>

                  {feedbackList.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="px-2.5 py-2.5 bg-zinc-800 hover:bg-red-900/40 text-zinc-400 hover:text-red-300 border border-zinc-700 rounded-xl text-xs transition"
                      title="清空所有回饋記錄"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {/* 統計指標卡片 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-950/50 border border-zinc-800 p-3 rounded-xl text-center">
                  <span className="text-[10px] text-zinc-400 block mb-0.5">
                    {selectedMonth === 'all' ? '全部月份' : `${selectedMonth} 月`} 回饋筆數
                  </span>
                  <span className="text-xl font-black text-amber-400">{stats.total} 則</span>
                </div>
                <div className="bg-zinc-950/50 border border-zinc-800 p-3 rounded-xl text-center">
                  <span className="text-[10px] text-zinc-400 block mb-0.5">平均用戶滿意度</span>
                  <span className="text-xl font-black text-amber-400">{stats.avgRating} ⭐</span>
                </div>
              </div>

              {/* 試算表防亂碼與 Google Sheets 說明提示 */}
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-[11px] text-indigo-300 leading-relaxed space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <span>💡</span>
                  <span>試算表匯出特別說明：</span>
                </p>
                <p className="text-indigo-200/80">
                  匯出的檔案為標準 UTF-8 BOM CSV 格式，可直接以 <strong>Microsoft Excel</strong> 或匯入 <strong>Google 試算表</strong> 開啟，繁體中文保證完全不亂碼，方便您每個月進行問題統整與產品改善追蹤！
                </p>
              </div>

              {/* 回饋清單項目展示 */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 tracking-wider">
                  回饋詳細清單 ({filteredFeedbacks.length})
                </h4>

                {loading ? (
                  <div className="text-center py-8 text-zinc-500 text-xs">載入中...</div>
                ) : filteredFeedbacks.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs space-y-1">
                    <p className="text-2xl">📭</p>
                    <p>該月份目前沒有回饋記錄</p>
                    <p className="text-[10px] text-zinc-600">歡迎點擊上方「填寫回饋問題」留下您的第一筆建議！</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {filteredFeedbacks.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 bg-zinc-800/40 border border-zinc-700/60 rounded-xl hover:border-zinc-600 transition space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md font-semibold text-[10px]">
                              {item.typeName}
                            </span>
                            <span className="font-bold text-zinc-200">{item.userName}</span>
                            <span className="text-amber-400 text-xs">
                              {'⭐'.repeat(item.rating)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500">
                              {new Date(item.createdAt).toLocaleDateString('zh-TW')}
                            </span>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-zinc-500 hover:text-red-400 transition"
                              title="刪除此筆記錄"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                          {item.content}
                        </p>

                        {item.contact && (
                          <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                            <span>聯絡資訊：</span>
                            <span className="text-zinc-400">{item.contact}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
