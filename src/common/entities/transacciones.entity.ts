import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { User } from 'src/common/entities/user.entity';

import { CRUDEntity } from 'src/common/utils/CRUD';

@Entity()
export class Transacciones extends CRUDEntity {
  @Column({ type: 'int4', nullable: true })
  childOf: number;

  @Column({ type: 'varchar', nullable: false })
  txType: string;

  @Column({ type: 'varchar', nullable: false })
  asset: string;

  @Column({ type: 'varchar', default: false })
  status: string;

  @Column({ type: 'varchar', nullable: false })
  from: string;

  @Column({ type: 'varchar', nullable: false })
  to: string;

  @Column({ type: 'varchar', nullable: true })
  memo?: string;

  @Column({ type: 'float', nullable: true })
  amount: number;

  @Column({ type: 'varchar', length: 100, default: 'stellar' })
  chain: string;

  @Column({ type: 'varchar', nullable: true })
  txHash: string;

  @Column({ type: 'varchar', nullable: false, unique: true })
  txUUID: string;

  @Column({ type: 'json', nullable: true })
  extra?: any;

  @Column({ type: 'boolean', default: false })
  reject: boolean;

  @Column({ type: 'float', nullable: true })
  rate: string;

  @Column({ type: 'float', nullable: false, default: 0 })
  fee: string;

  @Column({ type: 'varchar', nullable: false, default: 'pending' })
  webhookStatus: string;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'userId' })
  user: User;
}
