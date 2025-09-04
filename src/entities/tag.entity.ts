import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  Index,
} from 'typeorm';
import { CronJob } from './cronjob.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  name: string;

  @Column({ type: 'varchar', length: 7, default: '#808080' })
  color: string;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @ManyToMany(() => CronJob, (cronJob) => cronJob.tags)
  cronJobs: CronJob[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}