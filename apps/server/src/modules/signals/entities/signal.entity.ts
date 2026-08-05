import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('signals')
export class Signal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  estimationId!: string;

  @Column({
    type: 'enum',
    enum: [
      'functional_complexity',
      'architectural_complexity',
      'external_integrations',
      'requirement_stability',
      'uncertainty',
      'reliability_requirement',
      'platform_complexity',
      'schedule_pressure',
    ],
  })
  signalName!:
    | 'functional_complexity'
    | 'architectural_complexity'
    | 'external_integrations'
    | 'requirement_stability'
    | 'uncertainty'
    | 'reliability_requirement'
    | 'platform_complexity'
    | 'schedule_pressure';

  @Column({
    type: 'enum',
    enum: ['very_low', 'low', 'medium', 'high', 'very_high'],
  })
  rawLevel!: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

  @Column({ type: 'int' })
  ordinal!: -3 | -1 | 0 | 1 | 3;

  @Column({ type: 'float' })
  adjustmentFactor!: number;

  @Column({ type: 'text' })
  llmRationale!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
