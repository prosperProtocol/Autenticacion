import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  Memo,
  // AuthRequiredFlag,
  // AuthRevocableFlag,
  // AuthFlag,
} from '@stellar/stellar-sdk';

import {
  CreateWalletResponse,
  GetAccountBalancesDto,
  GetAccountBalancesResponse,
  IssueProsperToTreasuryDto,
  MakeProsperTransactionDto,
  MakeProsperTransactionResponse,
  SubmitTxResponse,
} from '../dto/stellar.dto';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private readonly stellarConfig: any;
  private serverCache: {
    testnet?: InstanceType<typeof Horizon.Server>;
    mainnet?: InstanceType<typeof Horizon.Server>;
  } = {};

  constructor(private readonly configService: ConfigService) {
    this.stellarConfig = this.configService.get('stellarConfig');
  }

  public getServer(isTestnet: boolean): InstanceType<typeof Horizon.Server> {
    const url = isTestnet
      ? this.stellarConfig.testnet_url
      : this.stellarConfig.mainnet_url;

    if (!url) {
      throw new NotFoundException(
        `Stellar server URL not configured for ${isTestnet ? 'testnet' : 'mainnet'}`,
      );
    }

    const cacheKey = isTestnet ? 'testnet' : 'mainnet';
    if (this.serverCache[cacheKey]) return this.serverCache[cacheKey]!;

    const server = new Horizon.Server(url);
    this.serverCache[cacheKey] = server;
    return server;
  }

  public getNetworkPassphrase(isTestnet: boolean): string {
    return isTestnet ? Networks.TESTNET : Networks.PUBLIC;
  }

  public getUSDCAsset(isTestnet: boolean): Asset {
    const issuer: string = isTestnet
      ? this.stellarConfig.usdc_issuer_address
      : this.stellarConfig.usdc_issuer_address_prod;

    if (!issuer) {
      throw new NotFoundException(
        `USDC issuer address not defined for ${isTestnet ? 'testnet' : 'mainnet'}`,
      );
    }
    return new Asset('USDC', Keypair.fromSecret(issuer).publicKey());
  }

  public getProsperAsset(isTestnet: boolean): Asset {
    const issuer: string = isTestnet
      ? this.stellarConfig.prosper_issuer_address
      : this.stellarConfig.prosper_issuer_address_prod;

    if (!issuer) {
      throw new NotFoundException(
        `PROSPER issuer address not defined for ${isTestnet ? 'testnet' : 'mainnet'}`,
      );
    }
    return new Asset('PROSPER', Keypair.fromSecret(issuer).publicKey());
  }

  public getProsperIssuer(isTestnet: boolean): Keypair {
    const issuer = isTestnet
      ? this.stellarConfig.prosper_issuer_address
      : this.stellarConfig.prosper_issuer_address_prod;

    if (!issuer) {
      this.logger.warn(
        `PROSPER issuer address not defined for ${isTestnet ? 'testnet' : 'mainnet'}`,
      );
      return;
    }
    return Keypair.fromSecret(issuer);
  }

  public getProsperTeasury(isTestnet: boolean): Keypair | null {
    const treasury = isTestnet
      ? this.stellarConfig.prosper_treasury_address
      : this.stellarConfig.prosper_treasury_address_prod;

    if (!treasury) {
      this.logger.warn(
        `PROSPER treasury address not defined for ${isTestnet ? 'testnet' : 'mainnet'}`,
      );
      return null;
    }
    return Keypair.fromSecret(treasury);
  }

  public async createAccountWithBalance(
    wallet: Keypair,
    isTestnet: boolean,
  ): Promise<SubmitTxResponse> {
    const netPass = this.getNetworkPassphrase(isTestnet);
    const server = this.getServer(isTestnet);
    const source = Keypair.fromSecret(this.stellarConfig.xlm_wallet_secret);
    const sourceAccount = await server.loadAccount(source.publicKey());
    const txn = new TransactionBuilder(sourceAccount, {
      fee: this.stellarConfig.base_fee,
    })
      .addOperation(
        Operation.createAccount({
          destination: wallet.publicKey(),
          startingBalance: this.stellarConfig.starting_balance,
        }),
      )
      .setNetworkPassphrase(netPass)
      .setTimeout(this.stellarConfig.timeout)
      .build();
    txn.sign(source);
    try {
      const response: Horizon.HorizonApi.SubmitTransactionResponse =
        await server.submitTransaction(txn);
      return {
        txHash: response.hash,
        ledger: response.ledger,
        successful: response.successful,
      };
    } catch (error) {
      this.logger.error(
        `Error createAccountWithBalance, xdr: ${txn.toXDR()}, error: `,
        error,
      );
      throw new BadRequestException(
        'Error creating account on Stellar network',
      );
    }
  }

  public async addUSDCTrustLine(
    keypair: Keypair,
    isTestnet: boolean,
  ): Promise<SubmitTxResponse> {
    const server = this.getServer(isTestnet);
    const account = await server.loadAccount(keypair.publicKey());
    const asset = this.getUSDCAsset(isTestnet);
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
      const response: Horizon.HorizonApi.SubmitTransactionResponse =
        await server.submitTransaction(txn);
      return {
        txHash: response.hash,
        ledger: response.ledger,
        successful: response.successful,
      };
    } catch (error) {
      this.logger.error(
        `Error addUSDCTrustLine failed, xdr: ${txn.toXDR()}, error: `,
        error,
      );
      throw new BadRequestException('Error adding trustline to PROSPER');
    }
  }

  public async addHomeDomainToIssuer(
    issuerSecret: string,
    homeDomain: string,
    isTestnet: boolean,
  ): Promise<SubmitTxResponse> {
    try {
      const server = this.getServer(isTestnet);
      const issuer = Keypair.fromSecret(issuerSecret);
      const issuerAccount = await server.loadAccount(issuer.publicKey());
      const netPass = this.getNetworkPassphrase(isTestnet);

      const txn = new TransactionBuilder(issuerAccount, {
        fee: this.stellarConfig.base_fee,
      })
        .addOperation(
          Operation.setOptions({
            homeDomain,
          }),
        )
        .setNetworkPassphrase(netPass)
        .setTimeout(this.stellarConfig.timeout)
        .build();

      txn.sign(issuer);
      try {
        const response: Horizon.HorizonApi.SubmitTransactionResponse =
          await server.submitTransaction(txn);
        return {
          txHash: response.hash,
          successful: response.successful,
          ledger: response.ledger,
        };
      } catch (error) {
        this.logger.error(
          `Error addHomeDomainToIssuer failed, xdr: ${txn.toXDR()}, error: `,
          error,
        );
      }
    } catch (error) {
      this.logger.error(`Error addHomeDomainToIssuer failed: `, error);
      throw new BadRequestException('Error setting home domain to issuer');
    }
  }

  public async getIsTestnet(): Promise<boolean> {
    const isTestnet = this.stellarConfig.is_testnet;
    if (isTestnet === undefined || isTestnet === null) {
      throw new BadRequestException('Stellar environment not configured');
    }
    return isTestnet;
  }

  public async createUserWallet(
    isTestnet: boolean,
  ): Promise<CreateWalletResponse> {
    const keypair = Keypair.random();
    try {
      await this.createAccountWithBalance(keypair, isTestnet);
      const response = await this.addUSDCTrustLine(keypair, isTestnet);
      return {
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
        successful: response.successful,
      };
    } catch (error) {
      this.logger.error('Error createUserWallet failed: ', error);
      throw new BadRequestException('Error creating user wallet');
    }
  }

  public async createProsperTreasury(
    isTestnet: boolean,
  ): Promise<CreateWalletResponse> {
    const treasury = Keypair.random();
    try {
      await this.createAccountWithBalance(treasury, isTestnet);
      // Treasury must trust the issuer to receive PROSPER
      await this.addUSDCTrustLine(treasury, isTestnet);
      return {
        publicKey: treasury.publicKey(),
        secretKey: treasury.secret(),
        successful: true,
      };
    } catch (error) {
      this.logger.error(`Error createProsperTreasury failed, error: `, error);
      throw new BadRequestException('Error creating Prosper treasury account');
    }
  }

  public async issueProsperToTreasury(
    payload: IssueProsperToTreasuryDto,
  ): Promise<SubmitTxResponse> {
    try {
      const { issuerSecret, treasuryPublic, amount, isTestnet } = payload;
      const server = this.getServer(isTestnet);
      const issuer = Keypair.fromSecret(issuerSecret);
      const issuerAccount = await server.loadAccount(issuer.publicKey());
      const prosperAsset = this.getUSDCAsset(isTestnet);
      const netPass = this.getNetworkPassphrase(isTestnet);

      const txn = new TransactionBuilder(issuerAccount, {
        fee: this.stellarConfig.base_fee,
      })
        .addOperation(
          Operation.payment({
            destination: treasuryPublic,
            asset: prosperAsset,
            amount,
          }),
        )
        .setNetworkPassphrase(netPass)
        .setTimeout(this.stellarConfig.timeout)
        .build();

      txn.sign(issuer);
      const response: Horizon.HorizonApi.SubmitTransactionResponse =
        await server.submitTransaction(txn);
      return {
        txHash: response.hash,
        successful: response.successful,
        ledger: response.ledger,
      };
    } catch (error) {
      this.logger.error(`Error issueProsperToTreasury failed, error: `, error);
      throw new BadRequestException('Error issuing Prosper to treasury');
    }
  }

  public async getAccountBalances(
    payload: GetAccountBalancesDto,
  ): Promise<GetAccountBalancesResponse> {
    try {
      const { address, isTestnet } = payload;
      const server = this.getServer(isTestnet);
      const account = await server.loadAccount(address);

      let balanceXLM = '0';
      let balanceUSDC = '0';

      const usdcIssuer = isTestnet
        ? this.stellarConfig.usdc_issuer_address
        : this.stellarConfig.usdc_issuer_address_prod;
      const usdcPublicKey = Keypair.fromSecret(usdcIssuer).publicKey();
      for (const b of account.balances) {
        if (b.asset_type === 'native') {
          balanceXLM = b.balance;
        } else {
          const assetCode = (b as any).asset_code;
          const assetIssuer = (b as any).asset_issuer;
          if (assetCode === 'USDC' && assetIssuer === usdcPublicKey) {
            balanceUSDC = b.balance;
          }
        }
      }

      return { address, balanceXLM, balanceUSDC };
    } catch (error) {
      this.logger.error(`Error fetching account balances, error: `, error);
      throw new BadRequestException('Error fetching account balances');
    }
  }

  public async makeUSDCTransaction(
    payload: MakeProsperTransactionDto,
  ): Promise<MakeProsperTransactionResponse> {
    try {
      const { sourcePrivateKey, receiverPublicKey, amount, isTestnet, memo } =
        payload;
      const server = this.getServer(isTestnet);
      const asset = this.getUSDCAsset(isTestnet);
      const memoText = memo || ' ';

      // verify receiver has PROSPER trustline
      // await this.verifyAccountProsper(receiverPublicKey, isTestnet);

      const sourceKeys = Keypair.fromSecret(sourcePrivateKey);
      const sourceAccount = await server.loadAccount(sourceKeys.publicKey());

      const txn = new TransactionBuilder(sourceAccount, {
        fee: this.stellarConfig.base_fee,
      })
        .addOperation(
          Operation.payment({
            amount: amount.toString(),
            asset,
            destination: receiverPublicKey,
          }),
        )
        .setNetworkPassphrase(this.getNetworkPassphrase(isTestnet))
        .setTimeout(this.stellarConfig.timeout)
        .addMemo(Memo.text(memoText))
        .build();

      txn.sign(sourceKeys);
      const response: Horizon.HorizonApi.SubmitTransactionResponse =
        await server.submitTransaction(txn);
      return {
        txHash: response.hash,
        successful: response.successful,
        ledger: response.ledger,
      };
    } catch (error) {
      this.logger.error(`Error making Prosper transaction, error: `, error);
      throw new BadRequestException('Error making Prosper transaction');
    }
  }
}
