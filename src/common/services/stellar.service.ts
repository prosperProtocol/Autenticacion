import {
  BadRequestException,
  Injectable,
  Logger,
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
import { HorizonApi } from '@stellar/stellar-sdk/lib/horizon';

import {
  CreateProsperIssuerResponse,
  CreateWalletResponse,
  GetAccountBalancesDto,
  GetAccountBalancesResponse,
  IssueProsperToTreasuryDto,
  MakeProsperTransactionDto,
  MakeProsperTransactionResponse,
  SubmitTxResponse,
} from '../dtos/stellar.dto';

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

  private getServer(isTestnet: boolean): InstanceType<typeof Horizon.Server> {
    const url = isTestnet
      ? this.stellarConfig.testnet_url
      : this.stellarConfig.mainnet_url;

    if (!url) {
      throw new Error(
        `Stellar server URL not configured for ${isTestnet ? 'testnet' : 'mainnet'}`,
      );
    }

    const cacheKey = isTestnet ? 'testnet' : 'mainnet';
    if (this.serverCache[cacheKey]) return this.serverCache[cacheKey]!;

    const server = new Horizon.Server(url);
    this.serverCache[cacheKey] = server;
    return server;
  }

  private getNetworkPassphrase(isTestnet: boolean): string {
    return isTestnet ? Networks.TESTNET : Networks.PUBLIC;
  }

  public getProsperAsset(isTestnet: boolean): Asset {
    const issuer = isTestnet
      ? this.stellarConfig.prosper_issuer_address
      : this.stellarConfig.prosper_issuer_address_prod;

    if (!issuer) {
      throw new Error(
        `PROSPER issuer address not defined for ${isTestnet ? 'testnet' : 'mainnet'}`,
      );
    }
    return new Asset('PROSPER', issuer);
  }

  public async getProsperTeasury(isTestnet: boolean): Promise<Keypair> {
    const treasury = isTestnet
      ? this.stellarConfig.prosper_treasury_address
      : this.stellarConfig.prosper_treasury_address_prod;

    if (!treasury) {
      throw new Error(
        `PROSPER treasury address not defined for ${isTestnet ? 'testnet' : 'mainnet'}`,
      );
    }
    return Keypair.fromSecret(treasury);
  }

  private async createAccountWithBalance(
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
      const response: HorizonApi.SubmitTransactionResponse =
        await server.submitTransaction(txn);
      return {
        txHash: response.hash,
        ledger: response.ledger,
        successful: response.successful,
      };
    } catch (error) {
      this.logger.error(
        `createAccountWithBalance failed: ${error}, xdr: ${txn.toXDR()}`,
      );
      throw new BadRequestException(
        'Error creating account on Stellar network',
      );
    }
  }

  private async addProsperTrustLine(
    keypair: Keypair,
    isTestnet: boolean,
  ): Promise<SubmitTxResponse> {
    const server = this.getServer(isTestnet);
    const account = await server.loadAccount(keypair.publicKey());
    const asset = this.getProsperAsset(isTestnet);
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
        ledger: response.ledger,
        successful: response.successful,
      };
    } catch (error) {
      this.logger.error(
        `addProsperTrustLine failed: ${error}, xdr: ${txn.toXDR()}`,
      );
      throw new BadRequestException('Error adding trustline to PROSPER');
    }
  }

  private async addHomeDomainToIssuer(
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
      const response: HorizonApi.SubmitTransactionResponse =
        await server.submitTransaction(txn);
      return {
        txHash: response.hash,
        successful: response.successful,
        ledger: response.ledger,
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('addHomeDomainToIssuer failed');
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
      const response = await this.addProsperTrustLine(keypair, isTestnet);
      return {
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
        successful: response.successful,
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('createUserWallet failed');
    }
  }

  public async createProsperIssuer(
    home_domain: string,
    isTestnet: boolean,
  ): Promise<CreateProsperIssuerResponse> {
    const configuredSecret = isTestnet
      ? this.stellarConfig.prosper_issuer_secret
      : this.stellarConfig.prosper_issuer_secret_prod;

    if (configuredSecret) {
      const kp = Keypair.fromSecret(configuredSecret);
      return {
        publicKey: kp.publicKey(),
        secretKey: undefined,
        alreadyConfigured: true,
      };
    }

    // create new issuer and fund it
    const issuer = Keypair.random();
    try {
      await this.createAccountWithBalance(issuer, isTestnet);
      await this.addHomeDomainToIssuer(issuer.secret(), home_domain, isTestnet);
      // issuer usually does not need a trustline; it issues the asset
      return {
        publicKey: issuer.publicKey(),
        secretKey: issuer.secret(),
        alreadyConfigured: false,
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('createProsperIssuer failed');
    }
  }

  public async createProsperTreasury(
    isTestnet: boolean,
  ): Promise<CreateWalletResponse> {
    const treasury = Keypair.random();
    try {
      await this.createAccountWithBalance(treasury, isTestnet);
      // Treasury must trust the issuer to receive PROSPER
      await this.addProsperTrustLine(treasury, isTestnet);
      return {
        publicKey: treasury.publicKey(),
        secretKey: treasury.secret(),
        successful: true,
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('createProsperTreasury failed');
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
      const prosperAsset = this.getProsperAsset(isTestnet);
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
      const response: HorizonApi.SubmitTransactionResponse =
        await server.submitTransaction(txn);
      return {
        txHash: response.hash,
        successful: response.successful,
        ledger: response.ledger,
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('issueProsperToTreasury failed');
    }
  }

  public async getAccountBalances(
    payload: GetAccountBalancesDto
  ): Promise<GetAccountBalancesResponse> {
    try {
      const { address, isTestnet } = payload;
      const server = this.getServer(isTestnet);
      const account = await server.loadAccount(address);

      let balanceXLM = '0';
      let balanceProsper = '0';

      const prosperIssuer = isTestnet
        ? this.stellarConfig.prosper_issuer_address
        : this.stellarConfig.prosper_issuer_address_prod;

      for (const b of account.balances) {
        if (b.asset_type === 'native') {
          balanceXLM = b.balance;
        } else {
          const assetCode = (b as any).asset_code;
          const assetIssuer = (b as any).asset_issuer;
          if (assetCode === 'PROSPER' && assetIssuer === prosperIssuer) {
            balanceProsper = b.balance;
          }
        }
      }

      return { address, balanceXLM, balanceProsper };
    } catch (error) {
      this.logger.error(`getAccountBalances failed: ${error}`);
      throw new BadRequestException('Error fetching account balances');
    }
  }

  public async makeProsperTransaction(
    payload: MakeProsperTransactionDto,
  ): Promise<MakeProsperTransactionResponse> {
    try {
      const {sourcePrivateKey, receiverPublicKey, amount, isTestnet, memo} = payload;
      const server = this.getServer(isTestnet);
      const asset = this.getProsperAsset(isTestnet);
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
      const response: HorizonApi.SubmitTransactionResponse = await server.submitTransaction(txn);
      return {
        txHash: response.hash,
        successful: response.successful,
        ledger: response.ledger,
      };
    } catch (error) {
      this.logger.error(`makeProsperTransaction failed: ${error}`);
      throw new BadRequestException('makeProsperTransaction failed');
    }
  }
}
/*

  public async verifyAccountProsper(
    publicKey: string,
    isTestnet: boolean,
  ): Promise<void> {
    const server = this.getServer(isTestnet);
    try {
      const account = await server.loadAccount(publicKey);
      const prosperIssuer = isTestnet
        ? this.stellarConfig.prosper_issuer_address
        : this.stellarConfig.prosper_issuer_address_prod;

      const hasProsper = account.balances.some((b: any) => {
        if (b.asset_type === 'native') return false;
        return b.asset_code === 'PROSPER' && b.asset_issuer === prosperIssuer;
      });

      if (!hasProsper) {
        throw new NotFoundException(`${publicKey} Balance PROSPER Not Found!`);
      }
    } catch (error) {
      this.logger.error(error);
      throw new NotFoundException(`${publicKey} Not Found!`);
    }
  }


  // Flags management for Non-Custodial issuers
  public async setIssuerAuthFlags(
    issuerSecret: string,
    isTestnet: boolean,
    requireAuth: boolean,
    revocable: boolean,
  ): Promise<{ txHash: string; successful: boolean }> {
    const server = this.getServer(isTestnet);
    const issuer = Keypair.fromSecret(issuerSecret);
    const issuerAccount = await server.loadAccount(issuer.publicKey());
    const netPass = this.getNetworkPassphrase(isTestnet);

    let flags = 0;
    if (requireAuth) flags |= AuthRequiredFlag;
    if (revocable) flags |= AuthRevocableFlag;

    const tx = new TransactionBuilder(issuerAccount, {
      fee: this.stellarConfig.base_fee,
    })
      .addOperation(
        Operation.setOptions({
          setFlags: flags === 0 ? undefined : (flags as unknown as AuthFlag),
        }),
      )
      .setNetworkPassphrase(netPass)
      .setTimeout(this.stellarConfig.timeout)
      .build();

    tx.sign(issuer);
    const res = await server.submitTransaction(tx);
    return { txHash: res.hash, successful: res.successful };
  }

  public async authorizeTrustline(
    issuerSecret: string,
    trustorPublic: string,
    assetCode: string,
    isTestnet: boolean,
  ): Promise<{ txHash: string; successful: boolean }> {
    const server = this.getServer(isTestnet);
    const issuer = Keypair.fromSecret(issuerSecret);
    const issuerAccount = await server.loadAccount(issuer.publicKey());
    const netPass = this.getNetworkPassphrase(isTestnet);

    const tx = new TransactionBuilder(issuerAccount, {
      fee: this.stellarConfig.base_fee,
    })
      .addOperation(
        Operation.allowTrust({
          trustor: trustorPublic,
          assetCode,
          authorize: true,
        }),
      )
      .setNetworkPassphrase(netPass)
      .setTimeout(this.stellarConfig.timeout)
      .build();

    tx.sign(issuer);
    const res = await server.submitTransaction(tx);
    return { txHash: res.hash, successful: res.successful };
  }

  public async clawback(
    issuerSecret: string,
    fromPublic: string,
    amount: string,
    isTestnet: boolean,
  ): Promise<{ txHash: string; successful: boolean }> {
    const server = this.getServer(isTestnet);
    const issuer = Keypair.fromSecret(issuerSecret);
    const issuerAccount = await server.loadAccount(issuer.publicKey());
    const asset = this.getProsperAsset(isTestnet);
    const netPass = this.getNetworkPassphrase(isTestnet);

    const tx = new TransactionBuilder(issuerAccount, {
      fee: this.stellarConfig.base_fee,
    })
      .addOperation(
        Operation.clawback({
          from: fromPublic,
          asset,
          amount,
        }),
      )
      .setNetworkPassphrase(netPass)
      .setTimeout(this.stellarConfig.timeout)
      .build();

    tx.sign(issuer);
    const res = await server.submitTransaction(tx);
    return { txHash: res.hash, successful: res.successful };
  }
}
*/