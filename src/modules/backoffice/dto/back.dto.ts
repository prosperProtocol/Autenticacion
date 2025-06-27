import { Expose } from 'class-transformer';

export class ActiveUserDto {
  @Expose()
  id: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  email: string;

  @Expose()
  memo: string;

  @Expose({ name: 'balance' })
  balanceUSDT: string;

  @Expose()
  status: string;
}

export class RejectUserDto {
  @Expose()
  id: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  email: string;

  @Expose()
  status: string;
}

export class FilteredTransactionDto {
  @Expose()
  id: number;

  @Expose()
  updatedAt: Date;

  @Expose()
  txType: string;

  @Expose()
  asset: string;

  @Expose()
  status: string;

  @Expose()
  amount: number;

  @Expose()
  chain: string;

  @Expose()
  txHash: string;
}
