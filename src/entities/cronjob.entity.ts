import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { ExecutionLog } from './execution-log.entity';
import { Tag } from './tag.entity';

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
}

export enum ScheduleType {
  CRON = 'cron',
  REPEAT = 'repeat',
}

export enum ExecutionMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
}

@Entity('cronjobs')
@Index(['isActive'])
@Index(['scheduleType'])
export class CronJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  @Index()
  name: string;

  @Column({ type: 'text' })
  url: string;

  @Column({
    type: process.env.DB_TYPE === 'mysql' ? 'enum' : 'text',
    enum: HttpMethod,
    default: HttpMethod.GET,
  })
  method: HttpMethod;

  @Column({ type: 'text', nullable: true })
  headers: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ length: 255 })
  schedule: string;

  @Column({
    type: process.env.DB_TYPE === 'mysql' ? 'enum' : 'text',
    enum: ScheduleType,
    default: ScheduleType.CRON,
  })
  scheduleType: ScheduleType;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'datetime', nullable: true })
  lastExecutedAt?: Date;

  @Column({ default: 0 })
  executionCount: number;

  @Column({ type: 'int', nullable: true })
  requestTimeout?: number; // Timeout in milliseconds

  @Column({
    type: process.env.DB_TYPE === 'mysql' ? 'enum' : 'text',
    enum: ExecutionMode,
    default: ExecutionMode.SEQUENTIAL,
  })
  executionMode: ExecutionMode;

  @Column({ type: 'int', default: 1 })
  maxConcurrent: number;

  @Column({ type: 'int', default: 0 })
  currentRunning: number;

  @OneToMany(() => ExecutionLog, (log) => log.job, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  executionLogs: ExecutionLog[];

  @ManyToMany(() => Tag, (tag) => tag.cronJobs, {
    cascade: ['insert', 'update'],
    eager: true,
  })
  @JoinTable({
    name: 'cronjob_tags',
    joinColumn: {
      name: 'cronjob_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'tag_id',
      referencedColumnName: 'id',
    },
  })
  tags: Tag[];
}