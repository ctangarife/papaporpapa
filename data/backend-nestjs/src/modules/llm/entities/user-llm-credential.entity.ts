import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type LLMProvider = 'ollama' | 'zai' | 'minimax';

@Entity({ name: 'user_llm_credentials', schema: 'llm' })
export class UserLLMCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  @Index()
  provider: LLMProvider;

  @Column({ name: 'api_key', type: 'text', nullable: true })
  apiKey: string; // Encrypted

  @Column({ name: 'api_endpoint', type: 'text', nullable: true })
  apiEndpoint: string;

  @Column({ name: 'model_name', type: 'varchar', length: 100, nullable: true })
  modelName: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
