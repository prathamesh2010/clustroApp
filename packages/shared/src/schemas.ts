import { z } from 'zod';
import { ClusterType, ClusterStatus, ClusterRole, SplitType, PaymentMethod, ActivityCategory } from './enums';

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().nullable(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const LoginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const CreateClusterSchema = z.object({
  name: z.string().min(2, 'Cluster name must be at least 2 characters').max(120),
  description: z.string().max(500).optional().nullable(),
  type: z.nativeEnum(ClusterType).default(ClusterType.FAMILY),
  status: z.nativeEnum(ClusterStatus).default(ClusterStatus.LIVE),
  currency: z.string().default('INR'),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  location: z.string().max(120).optional().nullable(),
});

export const UpdateClusterSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  type: z.nativeEnum(ClusterType).optional(),
  status: z.nativeEnum(ClusterStatus).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
});

export const AddMemberSchema = z.object({
  name: z.string().min(1, 'Member name is required').max(100),
  usernameOrEmail: z.string().optional().nullable(),
  role: z.nativeEnum(ClusterRole).default(ClusterRole.MEMBER),
  parentMemberId: z.string().uuid().optional().nullable(),
});

export const CreateExpenseSplitItemSchema = z.object({
  memberId: z.string().uuid(),
  amount: z.number().nonnegative().optional(),
  percentage: z.number().min(0).max(100).optional(),
  shares: z.number().positive().optional(),
});

export const CreateExpenseSchema = z.object({
  amount: z.number().positive('Expense amount must be greater than 0'),
  currency: z.string().default('INR'),
  description: z.string().min(1, 'Description is required').max(255),
  category: z.string().default(ActivityCategory.FOOD),
  paidByMemberId: z.string().uuid('Payer member ID is required'),
  splitType: z.nativeEnum(SplitType).default(SplitType.EQUAL),
  splitMemberIds: z.array(z.string().uuid()).min(1, 'Select at least one member to split with').optional(),
  customSplits: z.array(CreateExpenseSplitItemSchema).optional(),
  activityId: z.string().uuid().optional().nullable(),
  expenseDate: z.string().optional(),
  notes: z.string().max(1000).optional().nullable(),
  location: z.string().max(150).optional().nullable(),
});

export const RecordPaymentSchema = z.object({
  fromMemberId: z.string().uuid('Payer member ID is required'),
  toMemberId: z.string().uuid('Receiver member ID is required'),
  amount: z.number().positive('Payment amount must be greater than 0'),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.UPI),
  providerReference: z.string().max(100).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export const CreateActivitySchema = z.object({
  title: z.string().min(2, 'Activity title is required').max(150),
  description: z.string().max(500).optional().nullable(),
  category: z.nativeEnum(ActivityCategory).default(ActivityCategory.EVENT),
  date: z.string(),
  dayNumber: z.number().int().positive().optional().nullable(),
  clusterId: z.string().uuid().optional().nullable(),
});
