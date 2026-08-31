import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { stringify } from 'csv-stringify/sync';

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async exportClusterCsv(clusterId: string): Promise<{ filename: string; csvData: string }> {
    const cluster = await this.prisma.cluster.findUnique({
      where: { id: clusterId },
      include: {
        members: true,
        expenses: {
          where: { deletedAt: null },
          include: {
            paidByMember: true,
            splits: {
              include: { member: true },
            },
          },
          orderBy: { expenseDate: 'asc' },
        },
      },
    });

    if (!cluster) throw new NotFoundException('Cluster not found');

    const memberMap = new Map<string, string>();
    cluster.members.forEach((m) => memberMap.set(m.id, m.displayName));

    const rows = [
      ['Cluster Name', cluster.name],
      ['Type', cluster.type],
      ['Currency', cluster.currency],
      ['Generated On', new Date().toISOString()],
      [],
      ['Date', 'Description', 'Category', 'Paid By', 'Amount', 'Split Type', 'Split Among'],
    ];

    cluster.expenses.forEach((e) => {
      const splitNames = e.splits
        .map((s) => `${s.member.displayName} (₹${Number(s.allocatedAmount)})`)
        .join('; ');

      rows.push([
        e.expenseDate.toISOString().slice(0, 10),
        e.description,
        e.category,
        e.paidByMember?.displayName || 'Unknown',
        String(Number(e.amount)),
        e.splitType,
        splitNames,
      ]);
    });

    const csvData = stringify(rows);
    const cleanName = cluster.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${cleanName}_Expenses_${new Date().toISOString().slice(0, 10)}.csv`;

    return { filename, csvData };
  }
}
