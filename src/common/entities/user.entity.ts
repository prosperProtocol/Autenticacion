import { Column, Entity, OneToMany } from 'typeorm';

import { CRUDEntity } from 'src/common/utils/CRUD';
import { Wallets } from 'src/common/entities/wallets';

export enum UserStatus {
  rejected = 'rejected',
  approved = 'approved',
  active = 'active',
  pending = 'pending',
  open = 'open',
  incomplete = 'incomplete',
}

@Entity()
export class User extends CRUDEntity {
  @Column({ nullable: true })
  email: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.open,
  })
  status: UserStatus;

  /**
   * KYC
   */
  @Column({ nullable: true })
  fullName?: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  birthdate?: string;

  @Column({ nullable: true })
  gender?: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  dni?: string;

  @Column({ nullable: true })
  documentType?: string;

  // Localidad
  @Column({ nullable: true })
  countryCode?: string;

  @Column({ nullable: true })
  street?: string;

  @Column({ nullable: true })
  streetNumber?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  postalCode?: string;

  @Column({ nullable: true })
  docFront?: string;

  @Column({ nullable: true })
  docFrontUri?: string;

  @Column({ nullable: true })
  docBack?: string;

  @Column({ nullable: true })
  docBackUri?: string;

  @Column({ nullable: true })
  selfie?: string;

  @Column({ nullable: true })
  selfieUrl?: string;

  @Column({ nullable: true })
  statusKYC?: string;

  @Column({ nullable: true })
  aipriseStatus?: string;

  @Column({ nullable: true })
  aipriseId?: string;

  @OneToMany(() => Wallets, (wallets) => wallets.user)
  wallets: Wallets[];
}
