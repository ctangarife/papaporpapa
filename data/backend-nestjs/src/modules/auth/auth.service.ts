import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Verificar si el email ya existe
    const existingUserByEmail = await this.usersService.findByEmail(registerDto.email);
    if (existingUserByEmail) {
      throw new ConflictException('El email ya está registrado');
    }

    // Verificar si el username ya existe (si se proporciona)
    if (registerDto.username) {
      const existingUserByUsername = await this.usersService.findByUsername(registerDto.username);
      if (existingUserByUsername) {
        throw new ConflictException('El nombre de usuario ya está en uso');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    // Generar username si no se proporcionó
    const username = registerDto.username || await this.generateUsername(registerDto.firstName);

    // Crear usuario
    const user = await this.usersService.create({
      email: registerDto.email,
      passwordHash,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      username,
      coinsBalance: 0,
      birthDate: registerDto.birthDate ? new Date(registerDto.birthDate) : null,
      diagnosis: registerDto.diagnosis || null,
      onboardingCompleted: false,
      aiPreferences: this.getDefaultIAPreferences(registerDto.diagnosis),
    });

    // Generar token
    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.firstName,
        lastName: user.lastName,
        username: user.username,
        coinsBalance: user.coinsBalance,
        onboardingCompleted: user.onboardingCompleted,
      },
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.firstName,
        lastName: user.lastName,
        username: user.username,
        coinsBalance: user.coinsBalance,
        onboardingCompleted: user.onboardingCompleted,
      },
      token,
    };
  }

  private generateToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  /**
   * Marca el onboarding como completado para el usuario
   */
  async completeOnboarding(userId: string) {
    const user = await this.usersService.updateOnboarding(userId, true);
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.firstName,
        onboardingCompleted: user.onboardingCompleted,
      },
    };
  }

  private async generateUsername(name: string): Promise<string> {
    const baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    let username = baseUsername;
    let counter = 1;

    while (await this.usersService.findByUsername(username)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }

  private getDefaultIAPreferences(diagnosis?: string): string {
    // Preferencias por defecto según el diagnóstico para mejorar la experiencia
    const preferences: any = {
      communicationStyle: 'direct', // Por defecto: comunicación directa
      taskBreakdown: 'small', // Por defecto: tareas pequeñas
      reminders: true,
      celebrateMilestones: true,
    };

    switch (diagnosis) {
      case 'TEA':
      case 'TEA_TDHA':
        preferences.communicationStyle = 'clear';
        preferences.taskBreakdown = 'very_small';
        preferences.useVisuals = true;
        preferences.avoidFigurativeLanguage = true;
        break;
      case 'TDHA':
        preferences.taskBreakdown = 'small';
        preferences.shortInstructions = true;
        preferences.urgentDeadline = true;
        break;
    }

    return JSON.stringify(preferences);
  }
}
