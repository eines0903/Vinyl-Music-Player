export type FeedbackType = 'feature' | 'bug' | 'song' | 'other';

export interface FeedbackItem {
  id: string;
  createdAt: number;
  monthKey: string; // e.g. "2026-10"
  type: FeedbackType;
  typeName: string;
  rating: number; // 1 to 5
  userName: string;
  contact: string;
  content: string;
  deviceInfo: string;
}
