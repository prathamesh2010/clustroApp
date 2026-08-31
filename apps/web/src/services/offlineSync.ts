/**
 * Offline Draft Outbox Sync Manager for Clustro.app
 * Provides resilient expense drafting when connectivity is low.
 */

export interface OfflineDraftExpense {
  id: string;
  clusterId: string;
  amount: number;
  description: string;
  category: string;
  paidByMemberId: string;
  splitType: string;
  splitMemberIds?: string[];
  createdAt: string;
}

const DRAFTS_KEY = 'clustro_offline_drafts';

export function getOfflineDrafts(): OfflineDraftExpense[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveOfflineDraft(draft: OfflineDraftExpense): void {
  const current = getOfflineDrafts();
  current.push(draft);
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(current));
}

export function removeOfflineDraft(id: string): void {
  const current = getOfflineDrafts().filter((d) => d.id !== id);
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(current));
}
