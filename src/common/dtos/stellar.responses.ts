export interface CreateAccountWithUSDCResponse {
  publicKey: string;
  secretKey: string;
  successful: boolean;
}

export interface SaldoStellarResponse {
  balanceXLM: string;
  balanceWallet: string;
}

export interface SaldoStellarCircleResponse {
  data: {
    walletAddress: string;
    WalletBalance: string;
    tokenBalance: string;
  };
  status: boolean;
  msg: string;
  error: boolean;
}

export interface MakeTransactionResponse {
  txHash: string;
  successful: boolean;
}

export interface MakeCircleTransactionResponse {
  hash: string;
}

export interface CheckAccountMemoResponse {
  hash: string | null;
  amount: string | null;
}

export interface CheckAccountDetailsResponse {
  memo: string;
  successful: boolean | string;
  hash: string;
  createdAt: string;
  operations: {
    from: string;
    to: string;
    assetCode: string;
    amount: string;
  }[];
}

export interface CheckTxHashResponse {
  successful: boolean;
  createdAt: string;
  fee: number;
  maxFee: number;
  memo: string;
  operations: {
    type: string;
    assetCode: string;
    from: string;
    to: string;
    amount: string;
  }[];
}

export interface GetAccountTransactionsResponse {
  successful: boolean;
  createdAt: string;
  feeCharged: number;
  maxFee: number;
  memo: string;
  hash: string;
}

export interface Sep10ChallengeResponse {
  transaction: string;
  network_passphrase: string;
}

export interface ReadChallengeTxResponse {
  jti: string;
  iss: string;
  sub: string;
  iat: number;
  exp: number;
  home_domain: string;
  client_domain: string;
}
