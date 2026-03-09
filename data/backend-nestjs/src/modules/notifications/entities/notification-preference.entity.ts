import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'notification_preferences', schema: 'auth' })
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'frequency_hours', default: 4 })
  frequencyHours: number;

  @Column({ name: 'quiet_hours_start', default: '22:00' })
  quietHoursStart: string;

  @Column({ name: 'quiet_hours_end', default: '08:00' })
  quietHoursEnd: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
