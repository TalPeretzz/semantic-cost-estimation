import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('evaluation_runs')
export class EvaluationRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 200 })
  name!: string;

  @CreateDateColumn()
  runAt!: Date;

  @Column({ type: 'int' })
  sampleSize!: number;

  @Column({ type: 'jsonb' })
  projectIds!: string[];

  @Column({ type: 'float' })
  baselineMae!: number;

  @Column({ type: 'float' })
  baselineRmse!: number;

  @Column({ type: 'float' })
  baselineMape!: number;

  @Column({ type: 'float' })
  hybridMae!: number;

  @Column({ type: 'float' })
  hybridRmse!: number;

  @Column({ type: 'float' })
  hybridMape!: number;
}
