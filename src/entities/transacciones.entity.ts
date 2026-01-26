import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

import { Wallets } from './wallets';

export enum TransferStatus {
  Pendiente = 'Pendiente',
  Rechazada = 'Rechazada',
  Completada = 'Completada',
}

export enum WebhookStatus {
  Pendiente = 'Pendiente',
  Recibido = 'Recibido',
  Rechazado = 'Rechazado',
}

export enum FundsStatus {
  BalanceStaking = 'BalanceStaking',
  BalanceToken = 'BalanceToken',
}

export enum TxType {
  Mint = 'Mint',
  Depósito = 'Depósito',
  Retiro = 'Retiro',
  Transferencia = 'Transferencia',
  Staking = 'Staking',
}

@Entity()
export class Transacciones {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float', nullable: true })
  amount: number;

  @Column({ type: 'varchar', nullable: false })
  asset: string;

  @Column({ type: 'varchar', nullable: false })
  from: string;

  @Column({ type: 'varchar', nullable: false })
  to: string;

  @Column({ type: 'varchar', nullable: true })
  memo: string;

  @Column({
    type: 'enum',
    enum: TransferStatus,
    nullable: false,
    default: TransferStatus.Pendiente,
  })
  status: TransferStatus;

  @Column({ type: 'enum', enum: TxType, nullable: false })
  txType: TxType;

  @Column({ type: 'varchar', nullable: true })
  txHash: string;

  @Column({
    type: 'enum',
    enum: WebhookStatus,
    nullable: false,
    default: WebhookStatus.Pendiente,
  })
  webhookStatus: WebhookStatus;

  @ManyToOne(() => Wallets, (w) => w.transactionsFrom, { nullable: true })
  @JoinColumn({ name: 'walletFromId' })
  walletFrom?: Wallets;

    @Column({ name: 'walletFromId', nullable: true })
  walletFromId: number;

  @ManyToOne(() => Wallets, (w) => w.transactionsTo, { nullable: true })
  @JoinColumn({ name: 'walletToId' })
  walletTo?: Wallets;

  @Column({ name: 'walletToId', nullable: true })
  walletToId: number;

  @Column({ type: 'json', nullable: true })
  extra?: any;

  @CreateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    type: 'timestamptz',
    default: null,
  })
  deletedAt: Date;
}
