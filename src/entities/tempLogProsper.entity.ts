import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('temp_log_prosper')
export class TempLogProsper {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({ nullable: true })
  process: string;

  @Column({ nullable: true })
  method: string;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: true,
  })
  date: Date;
}
