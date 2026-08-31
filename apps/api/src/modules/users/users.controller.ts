import { Controller, Get, Patch, Query, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  async search(@Query('q') q: string, @CurrentUser('id') userId: string) {
    return this.usersService.searchUsers(q, userId);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() body: { name?: string; phone?: string; avatarUrl?: string; defaultCurrency?: string },
  ) {
    return this.usersService.updateProfile(userId, body);
  }
}
