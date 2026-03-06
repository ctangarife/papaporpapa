import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity({ name: 'tasks', schema: 'projects' })
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    default: 'pending',
  })
  status: 'pending' | 'completed' | 'blocked' | 'skipped';

  @Column({ name: 'coin_value', default: 10 })
  coinValue: number;

  @Column({ name: 'sort_order' })
  sortOrder: number;

  @Column({ name: 'depends_on', type: 'uuid', array: true, default: [] })
  dependsOn: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;

  @Column({ name: 'skipped_at', nullable: true })
  skippedAt: Date;

  @ManyToOne(() => Project, (project) => project.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
