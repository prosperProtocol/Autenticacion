import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';

import { Transacciones } from './transacciones.entity';

export enum WalletStatus {
  active = 'active',
  inactive = 'inactive',
  blocked = 'blocked',
  suspended = 'suspended',
}

export class Balances {
  asset!: string;
  balance!: number;
  updatedAt!: Date;
}

@Entity()
export class Wallets {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  prosperId!: string;

  @Column({ type: 'varchar', nullable: true })
  prosperType?: string;

  @Column({ type: 'varchar', nullable: true })
  cashin?: string;

  @Column({ type: 'varchar' })
  address!: string;

  @Column({ type: 'varchar' })
  secret!: string;

  @Column('jsonb', { array: true, nullable: true })
  balances?: Balances[];

  @Column({
    type: 'enum',
    enum: WalletStatus,
    default: WalletStatus.active,
  })
  status!: WalletStatus;

  @OneToMany(() => Transacciones, (t) => t.walletFrom)
  transactionsFrom?: Transacciones[];

  @OneToMany(() => Transacciones, (t) => t.walletTo)
  transactionsTo?: Transacciones[];

  @CreateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  @DeleteDateColumn({
    type: 'timestamptz',
    default: null,
  })
  deletedAt!: Date;
}
