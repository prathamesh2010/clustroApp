import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClustersModule } from './modules/clusters/clusters.module';
import { MembersModule } from './modules/members/members.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { SettlementModule } from './modules/settlements/settlement.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ExportsModule } from './modules/exports/exports.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    ClustersModule,
    MembersModule,
    ExpensesModule,
    SettlementModule,
    LedgerModule,
    ActivitiesModule,
    ChatModule,
    NotificationsModule,
    ExportsModule,
    StorageModule,
  ],
})
export class AppModule {}
