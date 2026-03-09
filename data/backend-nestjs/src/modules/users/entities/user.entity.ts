import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity({ name: 'users', schema: 'auth' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name', nullable: true })
  lastName: string;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column({ name: 'coins_balance', default: 0 })
  coinsBalance: number;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: Date;

  @Column({ nullable: true })
  diagnosis: string;

  @Column({ name: 'ai_preferences', type: 'text', nullable: true })
  aiPreferences: string; // JSON string

  @Column({ name: 'onboarding_completed', type: 'boolean', default: false })
  onboardingCompleted: boolean;

  @Column({ name: 'last_interaction_at', type: 'timestamp with time zone', nullable: true })
  lastInteractionAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Project, (project) => project.user)
  projects: Project[];
}
