import { PrismaClient, ClusterType, ClusterStatus, ClusterRole, SplitType, ActivityCategory, ActionType, PaymentMethod, PaymentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Clustro.app database with realistic test data...');

  // Clean existing data in reverse order of foreign keys
  await prisma.activityLog.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.expenseAttachment.deleteMany();
  await prisma.expenseSplit.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.settlementPayment.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.clusterMember.deleteMany();
  await prisma.recurringExpense.deleteMany();
  await prisma.cluster.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.directMessage.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const meera = await prisma.user.create({
    data: {
      name: 'Meera Sharma',
      username: 'meera',
      email: 'meera@clustro.app',
      phone: '+919876543210',
      passwordHash,
      defaultCurrency: 'INR',
    },
  });

  const ramesh = await prisma.user.create({
    data: {
      name: 'Ramesh Sharma',
      username: 'ramesh',
      email: 'ramesh@clustro.app',
      phone: '+919876543211',
      passwordHash,
      defaultCurrency: 'INR',
    },
  });

  const priya = await prisma.user.create({
    data: {
      name: 'Priya Patel',
      username: 'priya',
      email: 'priya@clustro.app',
      phone: '+919876543212',
      passwordHash,
      defaultCurrency: 'INR',
    },
  });

  const aravind = await prisma.user.create({
    data: {
      name: 'Aravind Rao',
      username: 'aravind',
      email: 'aravind@clustro.app',
      phone: '+919876543213',
      passwordHash,
      defaultCurrency: 'INR',
    },
  });

  const sneha = await prisma.user.create({
    data: {
      name: 'Sneha Kulkarni',
      username: 'sneha',
      email: 'sneha@clustro.app',
      phone: '+919876543214',
      passwordHash,
      defaultCurrency: 'INR',
    },
  });

  console.log('Created 5 registered users');

  // 2. CLUSTER 1: "Sharma Ghar" (Family Cluster with Inherited Rollup)
  const familyCluster = await prisma.cluster.create({
    data: {
      name: 'Sharma Ghar',
      description: 'Family shared household expenses & monthly ledger',
      type: ClusterType.family,
      status: ClusterStatus.live,
      currency: 'INR',
      ownerId: meera.id,
      startDate: new Date('2026-01-01'),
    },
  });

  // Members in Family Cluster
  const mMeera = await prisma.clusterMember.create({
    data: {
      clusterId: familyCluster.id,
      userId: meera.id,
      displayName: 'Meera (Mom)',
      role: ClusterRole.owner,
    },
  });

  const mRamesh = await prisma.clusterMember.create({
    data: {
      clusterId: familyCluster.id,
      userId: ramesh.id,
      displayName: 'Ramesh (Dad)',
      role: ClusterRole.head,
    },
  });

  const mAarav = await prisma.clusterMember.create({
    data: {
      clusterId: familyCluster.id,
      displayName: 'Aarav (Son)',
      role: ClusterRole.inherited,
      parentMemberId: mRamesh.id, // Rolls up to Ramesh
      isPlaceholder: true,
    },
  });

  const mAnanya = await prisma.clusterMember.create({
    data: {
      clusterId: familyCluster.id,
      displayName: 'Ananya (Daughter)',
      role: ClusterRole.inherited,
      parentMemberId: mMeera.id, // Rolls up to Meera
      isPlaceholder: true,
    },
  });

  const mDadi = await prisma.clusterMember.create({
    data: {
      clusterId: familyCluster.id,
      displayName: 'Dadi',
      role: ClusterRole.inherited,
      parentMemberId: mMeera.id, // Rolls up to Meera
      isPlaceholder: true,
    },
  });

  // Expenses in Family Cluster
  // 1. Groceries paid by Meera (split among Meera and Ramesh)
  const expGroceries = await prisma.expense.create({
    data: {
      clusterId: familyCluster.id,
      paidByMemberId: mMeera.id,
      amount: 4500.00,
      description: 'Monthly Groceries & D-Mart',
      category: ActivityCategory.FOOD,
      splitType: SplitType.EQUAL,
      createdByUserId: meera.id,
      splits: {
        create: [
          { memberId: mMeera.id, allocatedAmount: 2250.00 },
          { memberId: mRamesh.id, allocatedAmount: 2250.00 },
        ],
      },
    },
  });

  // 2. School fees & supplies paid by Ramesh (split among Meera and Ramesh)
  const expSchool = await prisma.expense.create({
    data: {
      clusterId: familyCluster.id,
      paidByMemberId: mRamesh.id,
      amount: 6000.00,
      description: "Aarav's School Books & Uniform",
      category: ActivityCategory.EVENT,
      splitType: SplitType.EQUAL,
      createdByUserId: ramesh.id,
      splits: {
        create: [
          { memberId: mMeera.id, allocatedAmount: 3000.00 },
          { memberId: mRamesh.id, allocatedAmount: 3000.00 },
        ],
      },
    },
  });

  // Activity Log
  await prisma.activityLog.createMany({
    data: [
      {
        clusterId: familyCluster.id,
        actorId: meera.id,
        actionType: ActionType.CLUSTER_CREATED,
        summaryText: 'Cluster "Sharma Ghar" created by Meera Sharma',
      },
      {
        clusterId: familyCluster.id,
        actorId: meera.id,
        actionType: ActionType.EXPENSE_CREATED,
        summaryText: 'Meera (Mom) paid ₹4,500 for "Monthly Groceries & D-Mart"',
      },
      {
        clusterId: familyCluster.id,
        actorId: ramesh.id,
        actionType: ActionType.EXPENSE_CREATED,
        summaryText: 'Ramesh (Dad) paid ₹6,000 for "Aarav\'s School Books & Uniform"',
      },
    ],
  });

  // 3. CLUSTER 2: "Goa Trip 2026" (Trip Cluster with Activities)
  const tripCluster = await prisma.cluster.create({
    data: {
      name: 'Goa Trip 2026',
      description: '3-Day beach vacation with friends & family',
      type: ClusterType.trip,
      status: ClusterStatus.live,
      currency: 'INR',
      location: 'North Goa, India',
      startDate: new Date('2026-08-15'),
      endDate: new Date('2026-08-18'),
      ownerId: ramesh.id,
    },
  });

  const tmRamesh = await prisma.clusterMember.create({
    data: { clusterId: tripCluster.id, userId: ramesh.id, displayName: 'Ramesh', role: ClusterRole.owner },
  });
  const tmMeera = await prisma.clusterMember.create({
    data: { clusterId: tripCluster.id, userId: meera.id, displayName: 'Meera', role: ClusterRole.member },
  });
  const tmPriya = await prisma.clusterMember.create({
    data: { clusterId: tripCluster.id, userId: priya.id, displayName: 'Priya', role: ClusterRole.member },
  });
  const tmAravind = await prisma.clusterMember.create({
    data: { clusterId: tripCluster.id, userId: aravind.id, displayName: 'Aravind', role: ClusterRole.member },
  });
  const tmSneha = await prisma.clusterMember.create({
    data: { clusterId: tripCluster.id, userId: sneha.id, displayName: 'Sneha', role: ClusterRole.member },
  });
  const tmRohan = await prisma.clusterMember.create({
    data: { clusterId: tripCluster.id, displayName: 'Rohan (Offline)', role: ClusterRole.member, isPlaceholder: true },
  });

  // Activities for Goa Trip
  const actDay1 = await prisma.activity.create({
    data: {
      clusterId: tripCluster.id,
      userId: ramesh.id,
      title: 'Day 1: Airport Cabs & Candolim Villa Check-in',
      category: ActivityCategory.STAY,
      date: new Date('2026-08-15'),
      dayNumber: 1,
    },
  });

  const actDay2 = await prisma.activity.create({
    data: {
      clusterId: tripCluster.id,
      userId: priya.id,
      title: 'Day 2: Baga Beach Water Sports & Sunset Cruise',
      category: ActivityCategory.TRAVEL,
      date: new Date('2026-08-16'),
      dayNumber: 2,
    },
  });

  const actDay3 = await prisma.activity.create({
    data: {
      clusterId: tripCluster.id,
      userId: aravind.id,
      title: 'Day 3: Anjuna Flea Market & Fisherman\'s Wharf Dinner',
      category: ActivityCategory.FOOD,
      date: new Date('2026-08-17'),
      dayNumber: 3,
    },
  });

  // Expenses for Goa Trip
  // 1. Villa booking: ₹24,000 paid by Ramesh (split 6 ways = ₹4,000 each)
  await prisma.expense.create({
    data: {
      clusterId: tripCluster.id,
      paidByMemberId: tmRamesh.id,
      amount: 24000.00,
      description: 'Private 4BHK Villa in Candolim (3 Nights)',
      category: ActivityCategory.STAY,
      activityId: actDay1.id,
      splitType: SplitType.EQUAL,
      createdByUserId: ramesh.id,
      splits: {
        create: [
          { memberId: tmRamesh.id, allocatedAmount: 4000.00 },
          { memberId: tmMeera.id, allocatedAmount: 4000.00 },
          { memberId: tmPriya.id, allocatedAmount: 4000.00 },
          { memberId: tmAravind.id, allocatedAmount: 4000.00 },
          { memberId: tmSneha.id, allocatedAmount: 4000.00 },
          { memberId: tmRohan.id, allocatedAmount: 4000.00 },
        ],
      },
    },
  });

  // 2. Airport Cab Transfers: ₹3,600 paid by Priya (split 6 ways = ₹600 each)
  await prisma.expense.create({
    data: {
      clusterId: tripCluster.id,
      paidByMemberId: tmPriya.id,
      amount: 3600.00,
      description: '2x Innova Airport to Villa',
      category: ActivityCategory.TRAVEL,
      activityId: actDay1.id,
      splitType: SplitType.EQUAL,
      createdByUserId: priya.id,
      splits: {
        create: [
          { memberId: tmRamesh.id, allocatedAmount: 600.00 },
          { memberId: tmMeera.id, allocatedAmount: 600.00 },
          { memberId: tmPriya.id, allocatedAmount: 600.00 },
          { memberId: tmAravind.id, allocatedAmount: 600.00 },
          { memberId: tmSneha.id, allocatedAmount: 600.00 },
          { memberId: tmRohan.id, allocatedAmount: 600.00 },
        ],
      },
    },
  });

  // 3. Seafood Dinner & Drinks: ₹7,800 paid by Aravind (split 6 ways = ₹1,300 each)
  await prisma.expense.create({
    data: {
      clusterId: tripCluster.id,
      paidByMemberId: tmAravind.id,
      amount: 7800.00,
      description: 'Seafood Buffet & Mocktails @ Fisherman\'s Wharf',
      category: ActivityCategory.FOOD,
      activityId: actDay3.id,
      splitType: SplitType.EQUAL,
      createdByUserId: aravind.id,
      splits: {
        create: [
          { memberId: tmRamesh.id, allocatedAmount: 1300.00 },
          { memberId: tmMeera.id, allocatedAmount: 1300.00 },
          { memberId: tmPriya.id, allocatedAmount: 1300.00 },
          { memberId: tmAravind.id, allocatedAmount: 1300.00 },
          { memberId: tmSneha.id, allocatedAmount: 1300.00 },
          { memberId: tmRohan.id, allocatedAmount: 1300.00 },
        ],
      },
    },
  });

  // Chat Messages for Goa Trip
  await prisma.chatMessage.createMany({
    data: [
      {
        clusterId: tripCluster.id,
        senderId: ramesh.id,
        messageText: 'Hey everyone! Villa is booked and keys are collected 🎉',
        createdAt: new Date('2026-08-15T10:00:00Z'),
      },
      {
        clusterId: tripCluster.id,
        senderId: priya.id,
        messageText: 'Awesome, cabs are already en route to the villa!',
        createdAt: new Date('2026-08-15T10:05:00Z'),
      },
      {
        clusterId: tripCluster.id,
        senderId: aravind.id,
        messageText: 'I booked the table for dinner tonight at Fisherman\'s Wharf.',
        createdAt: new Date('2026-08-15T11:20:00Z'),
      },
    ],
  });

  // 4. CLUSTER 3: "Sunrise Society Wing B" (Society / Chawl Cluster)
  const societyCluster = await prisma.cluster.create({
    data: {
      name: 'Sunrise Society Wing B',
      description: 'Building maintenance, water motor repairs & security funds',
      type: ClusterType.society,
      status: ClusterStatus.live,
      currency: 'INR',
      ownerId: priya.id,
    },
  });

  const smPriya = await prisma.clusterMember.create({
    data: { clusterId: societyCluster.id, userId: priya.id, displayName: 'Priya (Secretary)', role: ClusterRole.owner },
  });
  const smMeera = await prisma.clusterMember.create({
    data: { clusterId: societyCluster.id, userId: meera.id, displayName: 'Meera (Flat 301)', role: ClusterRole.member },
  });
  const smAravind = await prisma.clusterMember.create({
    data: { clusterId: societyCluster.id, userId: aravind.id, displayName: 'Aravind (Flat 302)', role: ClusterRole.member },
  });

  await prisma.expense.create({
    data: {
      clusterId: societyCluster.id,
      paidByMemberId: smPriya.id,
      amount: 4500.00,
      description: 'Water Pump Capacitor Replacement & Plumber Labour',
      category: ActivityCategory.MAINTENANCE,
      splitType: SplitType.EQUAL,
      createdByUserId: priya.id,
      splits: {
        create: [
          { memberId: smPriya.id, allocatedAmount: 1500.00 },
          { memberId: smMeera.id, allocatedAmount: 1500.00 },
          { memberId: smAravind.id, allocatedAmount: 1500.00 },
        ],
      },
    },
  });

  // 5. CLUSTER 4: "Diwali Party 2025" (Ended Cluster)
  const endedCluster = await prisma.cluster.create({
    data: {
      name: 'Diwali Party 2025',
      description: 'Diwali potluck, sweets, and fireworks celebration',
      type: ClusterType.party,
      status: ClusterStatus.ended,
      currency: 'INR',
      ownerId: sneha.id,
      startDate: new Date('2025-11-01'),
      endDate: new Date('2025-11-02'),
    },
  });

  const emSneha = await prisma.clusterMember.create({
    data: { clusterId: endedCluster.id, userId: sneha.id, displayName: 'Sneha', role: ClusterRole.owner },
  });
  const emMeera = await prisma.clusterMember.create({
    data: { clusterId: endedCluster.id, userId: meera.id, displayName: 'Meera', role: ClusterRole.member },
  });

  await prisma.expense.create({
    data: {
      clusterId: endedCluster.id,
      paidByMemberId: emSneha.id,
      amount: 3200.00,
      description: 'Mithai Boxes & Diya Decorations',
      category: ActivityCategory.EVENT,
      splitType: SplitType.EQUAL,
      createdByUserId: sneha.id,
      splits: {
        create: [
          { memberId: emSneha.id, allocatedAmount: 1600.00 },
          { memberId: emMeera.id, allocatedAmount: 1600.00 },
        ],
      },
    },
  });

  // Record completed settlement payment for ended cluster
  await prisma.settlementPayment.create({
    data: {
      clusterId: endedCluster.id,
      fromMemberId: emMeera.id,
      toMemberId: emSneha.id,
      amount: 1600.00,
      paymentMethod: PaymentMethod.UPI,
      providerReference: 'UPI-REF-20251103-98231',
      status: PaymentStatus.successful,
      note: 'Settled via GooglePay UPI',
      paidAt: new Date('2025-11-03T12:00:00Z'),
      recordedByUserId: meera.id,
    },
  });

  console.log('Seed completed successfully with 4 clusters and full financial records!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
