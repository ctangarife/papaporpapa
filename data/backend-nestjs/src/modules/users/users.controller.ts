import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    return {
      id: user.id,
      email: user.email,
      name: user.firstName,
      lastName: user.lastName,
      username: user.username,
      coinsBalance: user.coinsBalance,
      birthDate: user.birthDate,
      diagnosis: user.diagnosis,
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt,
    };
  }

  @Put('profile')
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(req.user.userId, updateProfileDto);
    return {
      id: user.id,
      email: user.email,
      name: user.firstName,
      lastName: user.lastName,
      username: user.username,
      coinsBalance: user.coinsBalance,
      diagnosis: user.diagnosis,
    };
  }
}
