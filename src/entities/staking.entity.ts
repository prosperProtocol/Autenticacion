import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export class ProximaFechaMonto {
  @Column({ nullable: false })
  fecha!: Date;

  @Column({ nullable: true })
  monto?: number;
}

export class InteresCada24Horas {
  @Column({ nullable: false })
  fecha!: Date;

  @Column({ nullable: true })
  hash?: string;

  @Column({ nullable: true })
  monto?: number;
}

@Entity()
export class Staking {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', nullable: false })
  email!: string;

  @Column({ type: 'varchar', nullable: false })
  wallet!: string;

  @Column({ type: 'varchar', nullable: false })
  hashDeposito!: string;

  @Column({ type: 'varchar', nullable: true })
  hashStaking?: string;

  @Column({ type: 'bigint', nullable: true })
  memoStaking?: number;

  @Column({ type: 'float', nullable: true })
  principalAmount?: number;

  @Column({ type: 'timestamptz', nullable: true })
  start?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  maturityPrincipal?: Date;

  @Column({ type: 'json', nullable: true })
  scheduleInterest?: any[];

  @Column({ type: 'float', nullable: true, default: 0 })
  porcentajeAnual?: number;

  @Column({ type: 'varchar', nullable: true })
  payoutAssetPrincipal?: string;

  @Column({ type: 'varchar', nullable: true })
  payoutAssetInterest?: string;

  @Column({ type: 'varchar', nullable: true })
  tokenInteres?: string;

  @Column({ type: 'float', nullable: true })
  claimedInterest?: number;

  @Column({ type: 'float', nullable: true })
  interesesAcumulados?: number;

  @Column({ type: 'float', nullable: true, default: 0 })
  proyectado?: number;

  @Column({ type: 'varchar', nullable: true })
  contractoId?: string;

  @Column({ type: 'float', nullable: true })
  principalRedeemed?: number;

  @Column({ type: 'json', nullable: true })
  proximaFechaMonto?: ProximaFechaMonto;

  @Column({ type: 'json', array: true, nullable: true })
  interesCada24Horas?: InteresCada24Horas[];

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
