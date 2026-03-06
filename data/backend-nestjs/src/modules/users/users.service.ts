import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async updateCoins(userId: string, amount: number): Promise<User> {
    console.log('[UsersService] updateCoins llamado - userId:', userId, 'amount:', amount);
    const user = await this.findById(userId);
    console.log('[UsersService] Usuario encontrado - balance actual:', user.coinsBalance);
    user.coinsBalance += amount;
    console.log('[UsersService] Nuevo balance:', user.coinsBalance);
    const savedUser = await this.usersRepository.save(user);
    console.log('[UsersService] Usuario guardado - nuevo balance:', savedUser.coinsBalance);
    return savedUser;
  }

  async updateOnboarding(userId: string, completed: boolean): Promise<User> {
    const user = await this.findById(userId);
    user.onboardingCompleted = completed;
    return this.usersRepository.save(user);
  }

  async updateProfile(userId: string, data: Partial<{ firstName: string; lastName: string; username: string; diagnosis: string }>): Promise<User> {
    const user = await this.findById(userId);

    if (data.username && data.username !== user.username) {
      const existing = await this.findByUsername(data.username);
      if (existing && existing.id !== userId) {
        throw new ConflictException('El nombre de usuario ya está en uso');
      }
      user.username = data.username;
    }

    if (data.firstName) user.firstName = data.firstName;
    if (data.lastName !== undefined) user.lastName = data.lastName;
    if (data.diagnosis !== undefined) user.diagnosis = data.diagnosis;

    return this.usersRepository.save(user);
  }
}
