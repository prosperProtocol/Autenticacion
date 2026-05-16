import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity()
export class Staking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: false })
  hash: string;

  @Column({ type: 'varchar', nullable: false })
  owner: string;

  @Column({ type: 'float', nullable: false })
  principalAmount: number;

  @Column({ type: 'timestamptz', nullable: false })
  start: Date;

  @Column({ type: 'timestamptz', nullable: false })
  maturityPrincipal: Date;

  @Column({ type: 'json', nullable: true })
  scheduleInterest?: any[];

  @Column({ type: 'float', nullable: false })
  rate: number;

  @Column({ type: 'varchar', nullable: false })
  payoutAssetInterest: string;

  @Column({ type: 'varchar', nullable: false })
  payoutAssetPrincipal: string;

  @Column({ type: 'float', nullable: true, default: 0 })
  claimedInterest: number;

  @Column({ type: 'float', nullable: true, default: 0 })
  principalRedeemed: number;

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
