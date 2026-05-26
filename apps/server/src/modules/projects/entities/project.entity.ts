import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 200 })
  name!: string;

  @Column({ type: 'enum', enum: ['freetext', 'structured'] })
  inputType!: 'freetext' | 'structured';

  @Column({ type: 'text', nullable: true })
  descriptionText!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  descriptionJson!: Record<string, string> | null;

  @Column({ type: 'enum', enum: ['organic', 'semi-detached', 'embedded'] })
  domain!: 'organic' | 'semi-detached' | 'embedded';

  @Column({ type: 'float' })
  sizeKloc!: number;

  @Column({ type: 'int' })
  teamSize!: number;

  @Column({
    type: 'enum',
    enum: ['very_low', 'low', 'nominal', 'high', 'very_high'],
  })
  experienceLevel!: 'very_low' | 'low' | 'nominal' | 'high' | 'very_high';

  @Column({ type: 'float', nullable: true })
  actualEffortPm!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
