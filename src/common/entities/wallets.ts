import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { CRUDEntity } from 'src/common/utils/CRUD';
import { User } from 'src/common/entities/user.entity';

export enum WalletStatus {
  active = 'active',
  inactive = 'inactive',
  blocked = 'blocked',
  suspended = 'suspended',
}

@Entity()
export class Wallets extends CRUDEntity {
  @Column({ default: null })
  alias?: string;

  @Column({ type: 'varchar' })
  asset: string;

  @Column({ type: 'decimal', default: 0 })
  balance: number;

  @Column({ default: null })
  chain?: string;

  @Column({ default: null })
  memo?: string;

  @Column({
    type: 'enum',
    enum: WalletStatus,
    default: WalletStatus.active,
  })
  status: WalletStatus;

  @ManyToOne(() => User, (user) => user.wallets, {
    nullable: true,
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: null })
  wallet?: string;
}
