import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LLMCredentialsController } from './llm-credentials.controller';
import { LLMCredentialsService } from './llm-credentials.service';
import { UserLLMCredential } from './entities/user-llm-credential.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserLLMCredential]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret',
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRATION') || '7d' },
      }),
    }),
  ],
  controllers: [LLMCredentialsController],
  providers: [LLMCredentialsService],
  exports: [LLMCredentialsService],
})
export class LLMCredentialsModule {}
