import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('estimations')
export class Estimation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending',
  })
  status!: 'pending' | 'running' | 'completed' | 'failed';

  @Column({ type: 'float', nullable: true })
  nominalEffortPm!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  cocomoInputs!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn()
  runAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
