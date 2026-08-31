import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      status: 'online',
      name: 'Clustro API Server',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        api: '/api/v1',
        auth: '/api/v1/auth',
        clusters: '/api/v1/clusters',
        expenses: '/api/v1/expenses',
        ledger: '/api/v1/ledger',
        notifications: '/api/v1/notifications',
      },
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
