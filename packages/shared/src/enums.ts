export enum ClusterType {
  FAMILY = 'family',
  FRIENDS = 'friends',
  TRIP = 'trip',
  PICNIC = 'picnic',
  PARTY = 'party',
  SOCIETY = 'society',
  VILLAGE = 'village',
  OFFICE = 'office',
  SPORTS = 'sports',
  CLUB = 'club',
  CUSTOM = 'custom',
}

export enum ClusterStatus {
  PENDING = 'pending', // Planning / Upcoming
  LIVE = 'live',       // Active
  SETTLEMENT = 'settlement', // In settlement process
  ENDED = 'ended',     // Completed / Archived
}

export enum ClusterRole {
  OWNER = 'owner',
  HEAD = 'head',             // Family/Group head (financially responsible for sub-group)
  MEMBER = 'member',         // Standard individual member
  INHERITED = 'inherited',   // Dependent / rolls up to a parent head
  BENEFICIARY = 'beneficiary',
  REPRESENTATIVE = 'representative',
}

export enum SplitType {
  EQUAL = 'EQUAL',
  CUSTOM = 'CUSTOM',
  PERCENTAGE = 'PERCENTAGE',
  SHARES = 'SHARES',
}

export enum PaymentStatus {
  INITIATED = 'initiated',
  PENDING = 'pending',
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  UPI = 'UPI',
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
  OTHER = 'OTHER',
}

export enum ActivityCategory {
  TRAVEL = 'TRAVEL',
  STAY = 'STAY',
  FOOD = 'FOOD',
  SHOPPING = 'SHOPPING',
  EVENT = 'EVENT',
  ENTERTAINMENT = 'ENTERTAINMENT',
  FITNESS = 'FITNESS',
  FAMILY = 'FAMILY',
  WORK = 'WORK',
  MAINTENANCE = 'MAINTENANCE',
  OTHER = 'OTHER',
}

export enum ActionType {
  CLUSTER_CREATED = 'CLUSTER_CREATED',
  MEMBER_ADDED = 'MEMBER_ADDED',
  MEMBER_REMOVED = 'MEMBER_REMOVED',
  MEMBER_ROLE_UPDATED = 'MEMBER_ROLE_UPDATED',
  EXPENSE_CREATED = 'EXPENSE_CREATED',
  EXPENSE_UPDATED = 'EXPENSE_UPDATED',
  EXPENSE_DELETED = 'EXPENSE_DELETED',
  SETTLEMENT_RECORDED = 'SETTLEMENT_RECORDED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  DATES_UPDATED = 'DATES_UPDATED',
  EXPORT_GENERATED = 'EXPORT_GENERATED',
}

export enum NotificationType {
  EXPENSE_ADDED = 'EXPENSE_ADDED',
  SETTLEMENT_REQUEST = 'SETTLEMENT_REQUEST',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  INVITATION = 'INVITATION',
  MEMBER_JOINED = 'MEMBER_JOINED',
  CLUSTER_STATUS = 'CLUSTER_STATUS',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  REMINDER = 'REMINDER',
}

export enum SubscriptionTier {
  FREE = 'FREE',
  PLUS = 'PLUS',
  PRO = 'PRO',
}
