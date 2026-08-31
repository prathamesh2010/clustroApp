import {
  ClusterType,
  ClusterStatus,
  ClusterRole,
  SplitType,
  PaymentStatus,
  PaymentMethod,
  ActivityCategory,
  ActionType,
  NotificationType,
  SubscriptionTier,
} from './enums';

export interface UserDto {
  id: string;
  email: string;
  phone?: string | null;
  name: string;
  username: string;
  avatarUrl?: string | null;
  defaultCurrency: string;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
}

export interface AuthResponseDto {
  user: UserDto;
  accessToken: string;
}

export interface ClusterMemberDto {
  id: string;
  clusterId: string;
  userId?: string | null;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  role: ClusterRole;
  parentMemberId?: string | null;
  isPlaceholder: boolean;
  isOnline: boolean;
  avatarUrl?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    username: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  parentMember?: {
    id: string;
    displayName: string;
    role: ClusterRole;
  } | null;
}

export interface ClusterDto {
  id: string;
  name: string;
  description?: string | null;
  type: ClusterType;
  status: ClusterStatus;
  currency: string;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  ownerId: string;
  inviteCode?: string | null;
  createdAt: string;
  updatedAt: string;
  members: ClusterMemberDto[];
  memberCount?: number;
  totalExpense?: number;
  myBalance?: {
    paid: number;
    owed: number;
    net: number;
  };
}

export interface ExpenseSplitDto {
  id: string;
  expenseId: string;
  memberId: string;
  allocatedAmount: number;
  percentageOrWeight?: number | null;
  member?: ClusterMemberDto;
}

export interface ExpenseAttachmentDto {
  id: string;
  expenseId: string;
  storageKey: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
}

export interface ExpenseDto {
  id: string;
  clusterId: string;
  paidByMemberId: string;
  amount: number;
  currency: string;
  description: string;
  category: ActivityCategory | string;
  expenseDate: string;
  splitType: SplitType;
  activityId?: string | null;
  location?: string | null;
  notes?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  paidByMember?: ClusterMemberDto;
  splits: ExpenseSplitDto[];
  attachments: ExpenseAttachmentDto[];
  activity?: {
    id: string;
    title: string;
    category: ActivityCategory;
  } | null;
}

export interface SettlementBalance {
  memberId: string;
  displayName: string;
  role: ClusterRole;
  isHead: boolean;
  paid: number;
  owed: number;
  net: number;
  rollupCount?: number;
  rollupNames?: string[];
}

export interface SettlementTransactionDto {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amount: number;
}

export interface SettlementSummaryDto {
  balances: SettlementBalance[];
  transactions: SettlementTransactionDto[];
  totalExpense: number;
  isSettled: boolean;
}

export interface PaymentRecordDto {
  id: string;
  clusterId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  providerReference?: string | null;
  note?: string | null;
  paidAt?: string | null;
  createdAt: string;
  fromMember?: ClusterMemberDto;
  toMember?: ClusterMemberDto;
}

export interface ActivityDto {
  id: string;
  clusterId?: string | null;
  userId: string;
  title: string;
  description?: string | null;
  category: ActivityCategory;
  date: string;
  dayNumber?: number | null;
  totalExpense?: number;
  expenseCount?: number;
  createdAt: string;
}

export interface ActivityLogDto {
  id: string;
  clusterId: string;
  actorId?: string | null;
  actionType: ActionType;
  summaryText: string;
  metadata?: Record<string, any>;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    username: string;
  } | null;
}

export interface ChatMessageDto {
  id: string;
  clusterId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  messageText: string;
  createdAt: string;
}

export interface NotificationDto {
  id: string;
  userId: string;
  clusterId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  linkUrl?: string | null;
  createdAt: string;
}

export interface PersonalLedgerClusterSummary {
  clusterId: string;
  clusterName: string;
  clusterType: ClusterType;
  clusterStatus: ClusterStatus;
  startDate?: string | null;
  endDate?: string | null;
  currency: string;
  totalClusterExpense: number;
  myPaid: number;
  myOwed: number;
  myNet: number;
  myEntriesCount: number;
  recentExpenses: {
    id: string;
    description: string;
    amount: number;
    myShare: number;
    createdAt: string;
  }[];
}

export interface PersonalDashboardSummaryDto {
  totalAcrossClusters: number;
  personalPaid: number;
  personalOwed: number;
  personalNet: number;
  activeClusterCount: number;
  pendingClusterCount: number;
  endedClusterCount: number;
  clusterSummaries: PersonalLedgerClusterSummary[];
  categoryBreakdown: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}
