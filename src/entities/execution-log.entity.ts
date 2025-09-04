import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CronJob } from './cronjob.entity';

export enum ExecutionStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('execution_logs')
@Index(['jobId'])
@Index(['executedAt'])
@Index(['status'])
export class ExecutionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: process.env.DB_TYPE === 'mysql' ? 'varchar' : 'text', length: process.env.DB_TYPE === 'mysql' ? 36 : undefined })
  jobId: string;

  @ManyToOne(() => CronJob, (job) => job.executionLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'jobId' })
  job: CronJob;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  executedAt: Date;

  @Column({
    type: process.env.DB_TYPE === 'mysql' ? 'enum' : 'text',
    enum: ExecutionStatus,
  })
  status: ExecutionStatus;

  @Column({ type: 'integer', nullable: true })
  responseCode: number;

  @Column({ type: 'integer', nullable: true })
  responseTime: number;

  @Column({ type: 'integer', nullable: true })
  executionTime: number;

  @Column({ type: 'text', nullable: true })
  responseBody: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ default: false })
  triggeredManually: boolean;
}