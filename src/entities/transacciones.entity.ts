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

import { CRUDEntity } from 'src/common/utils/CRUD';

import { Wallets } from './wallets';

export enum TransferStatus {
  PENDIENTE = 'Pendiente',
  RECHAZADA = 'Rechazada',
  COMPLETADA = 'Completada',
}

export enum WebhookStatus {
  PENDIENTE = 'Pendiente',
  RECIBIDO = 'Recibido',
  RECHAZADO = 'Rechazado',
}

export enum FundsStatus {
  BALANCE_STAKING = 'balanceStaking',
  BALANCE_TOKEN = 'balanceToken',
}

export enum TxType {
  DEPOSITO = 'Depósito',
  RETIRO = 'Retiro',
  TRANSFERENCIA = 'Transferencia',
  STAKING = 'Staking',
}

@Entity()
export class Transacciones extends CRUDEntity {
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
    default: TransferStatus.PENDIENTE,
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
    default: WebhookStatus.PENDIENTE,
  })
  webhookStatus: WebhookStatus;

  @ManyToOne(() => Wallets, (w) => w.transactionsFrom, { nullable: true })
  @JoinColumn({ name: 'walletFromId' })
  walletFrom?: Wallets;

  @ManyToOne(() => Wallets, (w) => w.transactionsTo, { nullable: true })
  @JoinColumn({ name: 'walletToId' })
  walletTo?: Wallets;

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
