import type { FeedbackItem } from '../types/feedback';

/**
 * 將使用者回饋資料轉換為相容於 Microsoft Excel 與 Google Sheets 的 CSV 格式 (支援 UTF-8 BOM 防中文亂碼)
 */
export function exportFeedbackToCSV(feedbackList: FeedbackItem[], selectedMonth?: string) {
  const filtered = selectedMonth && selectedMonth !== 'all'
    ? feedbackList.filter((item) => item.monthKey === selectedMonth)
    : feedbackList;

  if (filtered.length === 0) {
    alert('該月份尚無任何用戶回饋資料可匯出！');
    return;
  }

  // CSV 標題列
  const headers = [
    '回饋編號 (ID)',
    '提交日期時間',
    '統計月份',
    '回饋類型',
    '滿意度評分 (1-5星)',
    '用戶稱呼',
    '聯絡方式',
    '回饋內容與詳細問題',
    '瀏覽器與裝置環境',
  ];

  // 輔助函式：CSV 欄位安全轉義 (避免包含逗號、引號或換行時格式錯亂)
  const escapeCSV = (value: string | number) => {
    const stringVal = String(value ?? '').replace(/"/g, '""');
    return `"${stringVal}"`;
  };

  const rows = filtered.map((item) => {
    const dateStr = new Date(item.createdAt).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    return [
      escapeCSV(item.id),
      escapeCSV(dateStr),
      escapeCSV(item.monthKey),
      escapeCSV(item.typeName),
      escapeCSV(`${item.rating} 顆星`),
      escapeCSV(item.userName || '匿名用戶'),
      escapeCSV(item.contact || '無提供'),
      escapeCSV(item.content),
      escapeCSV(item.deviceInfo),
    ].join(',');
  });

  // 加入 UTF-8 BOM (\uFEFF) 確保 Excel 雙擊開啟時中文絕不出現亂碼
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const monthLabel = selectedMonth && selectedMonth !== 'all' ? selectedMonth : '全部月份';
  const fileName = `黑膠播放器_用戶回饋月報表_${monthLabel}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
