import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from 'src/common/entities/user.entity';

import { CRUDEntity } from 'src/common/utils/CRUD';

@Entity()
export class OtpToken extends CRUDEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column()
  token: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'boolean', nullable: true })
  alreadyUsed?: boolean;

  @Column({ default: 0 })
  retries: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
