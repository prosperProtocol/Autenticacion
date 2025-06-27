import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Asset,
  Contract,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
  WebAuth,
} from '@stellar/stellar-sdk';
import { HorizonApi } from '@stellar/stellar-sdk/lib/horizon';
import axios from 'axios';
import dayjs from 'dayjs';
import { v4 as uuid } from 'uuid';

import {
  SendStellarTransactionDto,
  StellarTransactionsDto,
  checkAccountDetailsDto,
  VerifyAccountDto,
  MakeTransactionDto,
  MakeCircleTransactionDto,
  CheckAccountDto,
  SignSep10ChallengeDto,
  ReadChallengeTxDto,
  GetSep10ChallengeDto,
} from '../dtos/stellar.dto';
import {
  CheckAccountDetailsResponse,
  CheckAccountMemoResponse,
  CheckTxHashResponse,
  CreateAccountWithUSDCResponse,
  GetAccountTransactionsResponse,
  MakeTransactionResponse,
  ReadChallengeTxResponse,
  SaldoStellarCircleResponse,
  SaldoStellarResponse,
  Sep10ChallengeResponse,
} from '../dtos/stellar.responses';
import { chunkArray } from '../utils/utils';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private readonly stellarConfig: any;
  constructor(private readonly configService: ConfigService) {
    this.stellarConfig = this.configService.get('config.stellar');
  }

  private getServer(isTestnet: boolean): InstanceType<typeof Horizon.Server> {
    const url = isTestnet
      ? this.stellarConfig.testnet_url
      : this.stellarConfig.mainnet_url;
    return new Horizon.Server(url);
  }

  public getNetworkPassphrase(isTestnet: boolean): string {
    return isTestnet ? Networks.TESTNET : Networks.PUBLIC;
  }

  private getUsdcAsset(isTestnet: boolean): Asset {
    const issuer = isTestnet
      ? this.stellarConfig.usdc_issuer_address
      : this.stellarConfig.usdc_issuer_address_prod;

    if (!issuer) {
      throw new Error(
        `USDC issuer address not defined for ${isTestnet ? 'testnet' : 'mainnet'}`,
      );
    }

    return new Asset('USDC', issuer);
  }

  private async createAccountWithBalance(
    Wallet: Keypair,
    isTestnet: boolean,
  ): Promise<{
    txHash: string;
    successful: boolean;
  }> {
    const netPass = this.getNetworkPassphrase(isTestnet);
    const server = this.getServer(isTestnet);
    const source = Keypair.fromSecret(this.stellarConfig.xlm_wallet_secret);
    const sourceAccount = await server.loadAccount(source.publicKey());
    const txn = new TransactionBuilder(sourceAccount, {
      fee: this.stellarConfig.base_fee,
    })
      .addOperation(
        Operation.createAccount({
          destination: Wallet.publicKey(),
          startingBalance: this.stellarConfig.starting_balance,
        }),
      )
      .setNetworkPassphrase(netPass)
      .setTimeout(this.stellarConfig.timeout)
      .build();
    txn.sign(source);
    try {
      const response: HorizonApi.SubmitTransactionResponse =
        await server.submitTransaction(txn);
      return {
        txHash: response.hash,
        successful: response.successful,
      };
    } catch (error) {
      this.logger.error(`addTrustLine failed: ${error}, txXDR: ${txn.toXDR()}`);
      throw new BadRequestException({
        message: error?.message || 'Error with Stellar Network',
        error: error?.name || 'Error',
        statusCode: 400,
      });
    }
  }

  private async addTrustLine(
    keypair: Keypair,
    isTestnet: boolean,
  ): Promise<{
    txHash: string;
    successful: boolean;
  }> {
    const server = this.getServer(isTestnet);
    const account = await server.loadAccount(keypair.publicKey());
    const asset = this.getUsdcAsset(isTestnet);
    const netPass = this.getNetworkPassphrase(isTestnet);
    const txn = new TransactionBuilder(account, {
      fee: this.stellarConfig.base_fee,
    })
      .addOperation(
        Operation.changeTrust({
          asset,
        }),
      )
      .setNetworkPassphrase(netPass)
      .setTimeout(this.stellarConfig.timeout)
      .build();

    txn.sign(keypair);
    try {
      const response: HorizonApi.SubmitTransactionResponse =
        await server.submitTransaction(txn);
      return {
        txHash: response.hash,
        successful: response.successful,
      };
    } catch (error) {
      this.logger.error(`addTrustLine failed: ${error}, txXDR: ${txn.toXDR()}`);
      throw new BadRequestException({
        message: error?.message || 'Error with Stellar Network',
        error: error?.name || 'Error',
        statusCode: 400,
      });
    }
  }

  public async createAccountWithUSDC(
    isTestnet: boolean,
  ): Promise<CreateAccountWithUSDCResponse> {
    this.logger.debug(
      `createAccountWithUSDC called with isTestnet: ${isTestnet}`,
    );
    const keypair = Keypair.random();
    const publicKey = keypair.publicKey();
    const secretKey = keypair.secret();

    try {
      await this.createAccountWithBalance(keypair, isTestnet);
      await this.addTrustLine(keypair, isTestnet);

      return { publicKey, secretKey, successful: true };
    } catch (error) {
      throw new BadRequestException(`createAccountWithUSDC failed: ${error}`);
    }
  }

  public async saldoStellarAlfred(): Promise<SaldoStellarResponse> {
    const server = this.getServer(this.stellarConfig.is_testnet);
    const sourceXLM = Keypair.fromSecret(this.stellarConfig.xlm_wallet_secret);
    const accountXLM = await server.loadAccount(sourceXLM.publicKey());
    const balanceXLM = accountXLM.balances
      .filter((elem) => elem.asset_type === 'native')
      .map((elem) => {
        return elem.balance;
      });

    const balanceWallet = accountXLM.balances
      .filter((elem) => elem.asset_type === 'credit_alphanum4')
      .map((elem) => {
        if (elem['asset_type'] == 'credit_alphanum4') {
          return elem.balance;
        }
      });

    return {
      balanceXLM: balanceXLM[0],
      balanceWallet: balanceWallet[0],
    };
  }

  public async saldoStellarCircle(): Promise<SaldoStellarCircleResponse> {
    const server = this.getServer(false);
    const sourceXLM = Keypair.fromSecret(this.stellarConfig.rampa_prod_secret);

    try {
      const accountXLM = await server.loadAccount(sourceXLM.publicKey());
      const balanceXLM = accountXLM.balances
        .filter((elem) => elem.asset_type === 'native')
        .map((elem) => {
          return elem.balance;
        });

      const balanceWallet = accountXLM.balances
        .filter((elem) => elem.asset_type === 'credit_alphanum4')
        .map((elem) => {
          if (elem['asset_type'] == 'credit_alphanum4') {
            return elem.balance;
          }
        });

      return {
        data: {
          walletAddress: sourceXLM.publicKey(),
          WalletBalance: balanceXLM[0],
          tokenBalance: balanceWallet[0],
        },
        status: true,
        msg: 'balances',
        error: false,
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('balances');
    }
  }

  public async verifyAccount(payload: VerifyAccountDto): Promise<string> {
    const isProd = payload.prod != null && payload.prod;
    const server = this.getServer(!isProd);
    try {
      const accountXLM = await server.loadAccount(payload.publicKey);
      const balanceWallet = accountXLM.balances
        .filter((elem) => elem.asset_type === 'credit_alphanum4')
        .map((elem) => {
          if (elem['asset_type'] == 'credit_alphanum4') {
            return elem.balance;
          }
        });
      if (!balanceWallet[0])
        throw new NotFoundException(
          `${payload.publicKey} Balance USDC Not Found!`,
        );
    } catch (error) {
      this.logger.error(error);
      throw new NotFoundException(`${payload.publicKey} Not Found!`);
    }
    return payload.publicKey;
  }

  public async makeTransaction(
    payload: MakeTransactionDto,
  ): Promise<MakeTransactionResponse> {
    const asset = this.getUsdcAsset(this.stellarConfig.is_testnet);
    const server = this.getServer(this.stellarConfig.is_testnet);
    const memo = payload?.memo || ' ';
    const netPass = this.getNetworkPassphrase(this.stellarConfig.is_testnet);

    const receiverKeys = Keypair.fromPublicKey(payload.receiverPublicKey);
    await this.verifyAccount({
      publicKey: receiverKeys.publicKey(),
      prod: !this.stellarConfig.is_testnet,
    });
    const sourceKeys = Keypair.fromSecret(payload.sourcePrivateKey);
    await this.verifyAccount({
      publicKey: sourceKeys.publicKey(),
      prod: !this.stellarConfig.is_testnet,
    });
    const sourceAccount = await server.loadAccount(sourceKeys.publicKey());

    const txn = new TransactionBuilder(sourceAccount, {
      fee: this.stellarConfig.base_fee,
    })
      .addOperation(
        Operation.payment({
          amount: payload.amount.toString(),
          asset,
          destination: receiverKeys.publicKey(),
        }),
      )
      .setNetworkPassphrase(netPass)
      .setTimeout(this.stellarConfig.timeout)
      .addMemo(Memo.text(memo))
      .build();
    txn.sign(sourceKeys);
    try {
      const response: HorizonApi.SubmitTransactionResponse =
        await server.submitTransaction(txn);
      return {
        txHash: response.hash,
        successful: response.successful,
      };
    } catch (error) {
      this.logger.error(
        `makeTransaction failed: ${error}, txXDR: ${txn.toXDR()}`,
      );
      throw new BadRequestException({
        message: error?.message || 'Error with Stellar Network',
        error: error?.name || 'Error',
        statusCode: 400,
      });
    }
  }

  public async makeCircleTransaction(
    payload: MakeCircleTransactionDto,
  ): Promise<CheckTxHashResponse> {
    if (payload.apiSecret != this.stellarConfig.rampa_prod_api) {
      throw new NotFoundException();
    }
    const asset = this.getUsdcAsset(this.stellarConfig.is_testnet);
    const server = this.getServer(this.stellarConfig.is_testnet);
    const memo = payload?.memo || ' ';
    const netPass = this.getNetworkPassphrase(this.stellarConfig.is_testnet);
    const receiverKeys = Keypair.fromPublicKey(payload.publicKey);
    await this.verifyAccount({
      publicKey: receiverKeys.publicKey(),
      prod: !this.stellarConfig.is_testnet,
    });
    const sourceKeys = Keypair.fromSecret(this.stellarConfig.rampa_prod_secret);
    const sourceAccount = await server.loadAccount(sourceKeys.publicKey());
    const [balanceWallet] = sourceAccount.balances
      .filter((elem) => elem.asset_type === 'credit_alphanum4')
      .map((elem) => {
        if (elem['asset_type'] == 'credit_alphanum4') {
          return elem.balance;
        }
      });
    if (parseFloat(balanceWallet) < payload.amount) {
      throw new BadRequestException(`Saldo Insuficiente`);
    }

    const txn = new TransactionBuilder(sourceAccount, {
      fee: this.stellarConfig.base_fee,
    })
      .addOperation(
        Operation.payment({
          amount: payload.amount.toString(),
          asset,
          destination: receiverKeys.publicKey(),
        }),
      )
      .setNetworkPassphrase(netPass)
      .setTimeout(this.stellarConfig.timeout)
      .addMemo(Memo.text(memo))
      .build();
    txn.sign(sourceKeys);
    try {
      const response: HorizonApi.SubmitTransactionResponse =
        await server.submitTransaction(txn);
      return await this.checkTxHash(response.hash);
    } catch (error) {
      this.logger.error(
        `makeTransaction failed: ${error}, txXDR: ${txn.toXDR()}`,
      );
      throw new BadRequestException({
        message: error?.message || 'Error with Stellar Network',
        error: error?.name || 'Error',
        statusCode: 400,
      });
    }
  }

  public async makeCirclePayment({
    apiSecret,
    address,
    memo,
    amount,
  }: {
    apiSecret: string;
    address: string;
    memo?: string;
    amount: number;
  }): Promise<CheckTxHashResponse> {
    return await this.makeCircleTransaction({
      apiSecret,
      publicKey: address,
      amount,
      memo,
    });
  }

  public async checkAccountMemo(
    payload: CheckAccountDto,
  ): Promise<CheckAccountMemoResponse> {
    const limitPerPage = 4;
    const prod = payload?.network == 'prod' ? true : false;
    const receiverKeys = Keypair.fromPublicKey(payload.account);
    await this.verifyAccount({
      publicKey: receiverKeys.publicKey(),
      prod,
    });
    const server = this.getServer(!prod);
    let page = await server
      .transactions()
      .forAccount(receiverKeys.publicKey())
      .order('desc')
      .limit(50)
      .call();
    for (let i = 0; i < limitPerPage; i++) {
      for (const tx of page.records) {
        this.logger.debug(`Checking transaction: ${tx.memo} - ${payload.memo}`);
        if (tx.memo && tx.memo === payload.memo) {
          const operationsPage = await tx.operations();
          const paymentOp = operationsPage.records.find(
            (op) =>
              (op.type === 'payment' ||
                op.type === 'path_payment_strict_receive') &&
              'amount' in op,
          );
          if (paymentOp) {
            // const from = (paymentOp as any).from;
            const to = (paymentOp as any).to;

            const assetType = (paymentOp as any).asset_type;
            const assetCode =
              assetType === 'native'
                ? 'XLM'
                : `${(paymentOp as any).asset_code}`;

            if (assetCode !== 'USDC' || to !== payload.account) {
              continue;
            }
          }
          return {
            hash: tx.hash,
            amount: paymentOp ? (paymentOp as any).amount : null,
          };
        }
      }

      if (page.records.length === limitPerPage && page.next) {
        page = await page.next();
      } else {
        break;
      }
    }
    return { hash: null, amount: null };
  }

  public async checkAccountDetails(
    payload: checkAccountDetailsDto,
  ): Promise<CheckAccountDetailsResponse[]> {
    const prod = payload?.network == 'prod' ? true : false;
    const receiverKeys = Keypair.fromPublicKey(payload.account);
    await this.verifyAccount({
      publicKey: receiverKeys.publicKey(),
      prod,
    });
    const server = this.getServer(!prod);
    const page = await server
      .transactions()
      .forAccount(receiverKeys.publicKey())
      .order('desc')
      .limit(payload.limit ?? 10)
      .call();

    const chunks = chunkArray(page.records, 10);
    const txDetails: any[] = [];

    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map(async (tx) => {
          const operationsPage = await tx.operations();

          const operations = operationsPage.records
            .filter(
              (op) =>
                (op.type === 'payment' ||
                  op.type === 'path_payment_strict_receive') &&
                'amount' in op,
            )
            .map((op) => {
              const from = (op as any).from;
              const to = (op as any).to;
              const assetType = (op as any).asset_type;
              const assetCode =
                assetType === 'native' ? 'XLM' : (op as any).asset_code;
              const amount = (op as any).amount;
              return { from, to, assetCode, amount };
            });

          return {
            memo: tx.memo ?? ' ',
            successful: tx.successful ?? ' ',
            hash: tx.hash ?? ' ',
            createdAt: tx.created_at ?? ' ',
            operations,
          };
        }),
      );

      txDetails.push(...results);
    }

    return txDetails;
  }

  public async checkTxHash(txHash: string): Promise<CheckTxHashResponse> {
    const server = this.getServer(this.stellarConfig.is_testnet);
    const tx = await server.transactions().transaction(txHash).call();

    const operations = await server
      .operations()
      .forTransaction(txHash)
      .limit(100)
      .call();

    const opRecords = operations.records
      .filter(
        (op) =>
          (op.type === 'payment' ||
            op.type === 'path_payment_strict_receive') &&
          'amount' in op,
      )
      .map((op) => {
        return {
          type: op.type,
          assetCode:
            op.asset_code || (op.asset_type === 'native' ? 'XLM' : undefined),
          from: op.from,
          to: op.to,
          amount: op.amount,
        };
      });

    return {
      successful: tx.successful,
      createdAt: tx.created_at,
      fee: Number(tx.fee_charged),
      maxFee: Number(tx.max_fee),
      memo: tx.memo,
      operations: opRecords,
    };
  }

  public async getAccountTransactions(
    accountId: string,
    limit = 10,
  ): Promise<GetAccountTransactionsResponse[]> {
    const server = this.getServer(this.stellarConfig.is_testnet);
    const txPage = await server
      .transactions()
      .forAccount(accountId)
      .order('desc')
      .limit(limit)
      .call();

    return txPage.records.map((tx) => ({
      successful: tx.successful,
      createdAt: tx.created_at,
      feeCharged: Number(tx.fee_charged),
      maxFee: Number(tx.max_fee),
      memo: tx.memo,
      hash: tx.hash,
    }));
  }

  public async getStellarTransactions(
    address: string,
    isTestnet: boolean,
  ): Promise<StellarTransactionsDto[]> {
    try {
      const server = this.getServer(isTestnet);
      const transactions = await server
        .transactions()
        .forAccount(address)
        .order('desc')
        .limit(10)
        .call();

      return transactions.records
        .filter((tx) => !!tx.memo)
        .map((tx) => ({
          txHash: tx.hash,
          memo: tx.memo,
          createdAt: tx.created_at,
        }));
    } catch (error) {
      throw new Error(`getTransactions failed: ${error}`);
    }
  }

  public async sendUSDC(
    dto: { destination: string; amount: string },
    isTestnet: boolean,
  ): Promise<SendStellarTransactionDto> {
    try {
      const server = this.getServer(isTestnet);
      const sourceSecret = this.stellarConfig.usdcSenderSecret;
      const sourceKeypair = Keypair.fromSecret(sourceSecret);
      const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());

      const usdcAsset = this.getUsdcAsset(isTestnet);

      const tx = new TransactionBuilder(sourceAccount, {
        fee: this.stellarConfig.base_fee,
        networkPassphrase: this.getNetworkPassphrase(isTestnet),
      })
        .addOperation(
          Operation.payment({
            destination: dto.destination,
            asset: usdcAsset,
            amount: dto.amount,
          }),
        )
        .setTimeout(this.stellarConfig.timeout)
        .build();

      tx.sign(sourceKeypair);
      const response: HorizonApi.SubmitTransactionResponse =
        await server.submitTransaction(tx);
      return {
        txHash: response.hash,
        successful: response.successful,
      };
    } catch (error) {
      throw new Error(`sendUSDC failed: ${error}`);
    }
  }

  private async getClientSigningKey(clientDomain: string): Promise<string> {
    const options = {
      method: 'GET',
      url: `https://${clientDomain}/.well-known/stellar.toml`,
    };
    try {
      const response = await axios.request(options);
      const toml = response.status === 200 ? response.data : '';
      const signingLine = toml
        ? toml.split('\n').find((line) => line.trim().startsWith('SIGNING_KEY'))
        : undefined;
      if (signingLine) {
        const match = signingLine.match(
          /SIGNING_KEY\s*=\s*["']?([^"'\s]+)["']?/,
        );
        if (match && match[1]) {
          return match[1];
        }
      } else {
        throw new BadRequestException(
          'SIGNING_KEY no encontrado en stellar.toml',
        );
      }
    } catch (error) {
      this.logger.error(`getClientSigningKey`);
      this.logger.error(error);
      throw error;
    }
  }

  public async checkTxForClientDomain(txXDR: string): Promise<string> {
    try {
      const netPass = this.getNetworkPassphrase(this.stellarConfig.is_testnet);
      const tx = TransactionBuilder.fromXDR(txXDR, netPass);
      const operations = tx.operations || [];
      const clientDomainOp = operations.find(
        (op: any) => op.type === 'manageData' && op.name === 'client_domain',
      );

      if (
        !clientDomainOp ||
        clientDomainOp.type !== 'manageData' ||
        typeof (clientDomainOp as any).value !== 'string'
      ) {
        throw new BadRequestException(`'client_domain' is required`);
      }

      const clientDomainValue = (clientDomainOp as any).value;

      if (
        // clientDomainValue.includes(this.stellarConfig.vesso_url) &&
        clientDomainValue.includes(this.stellarConfig.demo_wallet_url)
      ) {
        throw new BadRequestException(`Vibrant 'client_domain' is required`);
      }

      return clientDomainValue;
    } catch (error) {
      throw error;
    }
  }

  public async getSep10Challenge(
    payload: GetSep10ChallengeDto,
  ): Promise<Sep10ChallengeResponse> {
    if (payload.homeDomain != this.stellarConfig.home_domain)
      throw new BadRequestException(
        `Invalid homeDomain: a home domain must be provided for verification`,
      );
    try {
      const serverKeypair = Keypair.fromSecret(
        this.stellarConfig.anchor_signing_key,
      );
      const clientSigningKey = await this.getClientSigningKey(
        payload.clientDomain,
      );
      const netPass = this.getNetworkPassphrase(this.stellarConfig.is_testnet);
      const tx = WebAuth.buildChallengeTx(
        serverKeypair,
        payload.clientAccountID,
        payload.homeDomain,
        this.stellarConfig.timeout_sep10,
        netPass,
        this.stellarConfig.home_domain,
        null,
        payload.clientDomain,
        clientSigningKey,
      );
      return {
        transaction: tx,
        network_passphrase: netPass,
      };
    } catch (error) {
      throw error;
    }
  }

  public async signSep10Challenge(
    payload: SignSep10ChallengeDto,
  ): Promise<string> {
    const netPass = this.getNetworkPassphrase(this.stellarConfig.is_testnet);
    if (payload.clientDomain != this.stellarConfig.demo_wallet_url)
      throw new BadRequestException(
        `${this.stellarConfig.demo_wallet_url} 'clientDomain' is required`,
      );

    const tx = TransactionBuilder.fromXDR(payload.tx, netPass);
    tx.sign(Keypair.fromSecret(payload.secret));
    const params = new URLSearchParams({
      transaction: tx.toXDR(),
      network_passphrase: netPass,
    });
    const options = {
      method: 'POST',
      url: `https://${payload.clientDomain}/sign`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: params,
    };
    try {
      const response = await axios.request(options);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  public async readChallengeTx(
    payload: ReadChallengeTxDto,
  ): Promise<ReadChallengeTxResponse> {
    const netPass = this.getNetworkPassphrase(this.stellarConfig.is_testnet);
    try {
      const serverKeypair = Keypair.fromSecret(
        this.stellarConfig.anchor_signing_key,
      );
      const response = WebAuth.readChallengeTx(
        payload.transaction,
        serverKeypair.publicKey(),
        netPass,
        this.stellarConfig.home_domain,
        this.stellarConfig.home_domain,
      );
      const { tx, clientAccountID, matchedHomeDomain } = response;

      if (
        matchedHomeDomain.length < 0 &&
        matchedHomeDomain != this.stellarConfig.home_domain
      )
        throw new BadRequestException(
          `Invalid homeDomain: a home domain must be provided for verification`,
        );

      const client_domain = await this.checkTxForClientDomain(tx.toXDR());
      const exp = dayjs().add(1, 'day').unix();

      return {
        jti: uuid(),
        iss: `https://${this.stellarConfig.home_domain}/auth`,
        sub: clientAccountID,
        iat: Math.floor(new Date().getTime() / 1000),
        exp,
        home_domain: this.stellarConfig.home_domain,
        client_domain: client_domain,
      };
    } catch (error) {
      if (
        error.name === 'InvalidChallengeError' &&
        error.message.includes('expired')
      ) {
        throw new BadRequestException(
          'El challenge SEP-10 ha expirado. Por favor, solicita uno nuevo.',
        );
      }
      throw error;
    }
  }
}
