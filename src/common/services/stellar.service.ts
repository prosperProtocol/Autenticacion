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
import { decryptPrivateKey, encryptPrivateKey } from '../utils';
import { EncryptPrivateKeyDto } from '../dto/crypto.dto';

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
    return new Asset('USDC', issuer);
  }

  public getARSaAsset(): Asset {
    const code: string = this.stellarConfig.arsa_issue_code;
    const issuer: string = this.stellarConfig.arsa_issue_address;

    if (!issuer || !code) {
      throw new NotFoundException(
        `ARSa issuer address or code not defined for mainnet`,
      );
    }
    return new Asset(code, issuer);
  }

  public getProsperIssuer(isTestnet: boolean): { publicKey: string, secretKey: string } {
    const issuerKey = isTestnet
      ? this.stellarConfig.prosper_issuer_address
      : this.stellarConfig.prosper_issuer_address_prod;

    const issuerSecretKey = isTestnet
      ? this.stellarConfig.prosper_issuer_secret
      : this.stellarConfig.prosper_issuer_secret_prod;

    const issuerSecret = decryptPrivateKey(issuerSecretKey);

    if (!issuerKey || !issuerSecret) {
      this.logger.warn(
        `PROSPER issuer address or secret not defined for ${isTestnet ? 'testnet' : 'mainnet'}`,
      );
      throw new BadRequestException();
    }

    return { publicKey: issuerKey, secretKey: issuerSecret };
  }

  public getProsperTeasury(isTestnet: boolean): { publicKey: string, secretKey: string } | null {
    const treasuryKey = isTestnet
      ? this.stellarConfig.prosper_treasury_address
      : this.stellarConfig.prosper_treasury_address_prod;

    const treasurySecretEncrypted = isTestnet
      ? this.stellarConfig.prosper_treasury_secret
      : this.stellarConfig.prosper_treasury_secret_prod;

    const treasurySecret = decryptPrivateKey(treasurySecretEncrypted);

    if (!treasuryKey || !treasurySecret) {
      this.logger.warn(
        `PROSPER treasury address or secret not defined for ${isTestnet ? 'testnet' : 'mainnet'}`,
      );
      return null;
    }
    return { publicKey: treasuryKey, secretKey: treasurySecret };

  }

  public async createAccountWithBalance(
    wallet: Keypair,
    isTestnet: boolean,
  ): Promise<SubmitTxResponse> {
    const netPass = this.getNetworkPassphrase(isTestnet);
    const server = this.getServer(isTestnet);
    const secret = decryptPrivateKey(this.stellarConfig.xlm_wallet_secret)
    const source = Keypair.fromSecret(secret);
    const sourceAccount = await server.loadAccount(this.stellarConfig.xlm_wallet_public);
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

  public async addIssuersTrustLine(
    keypair: Keypair,
    isTestnet: boolean,
  ): Promise<SubmitTxResponse> {
    const server = this.getServer(isTestnet);
    const account = await server.loadAccount(keypair.publicKey());
    const assetUSDC = this.getUSDCAsset(isTestnet);
    const netPass = this.getNetworkPassphrase(isTestnet);

    let txnBuilder = new TransactionBuilder(account, {
      fee: this.stellarConfig.base_fee,
    }).addOperation(
      Operation.changeTrust({
        asset: assetUSDC,
      }),
    );

    if (!isTestnet) {
      txnBuilder = txnBuilder.addOperation(
        Operation.changeTrust({
          asset: this.getARSaAsset(),
        }),
      );
    }

    const txn = txnBuilder
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
        `Error addIssuersTrustLine failed, xdr: ${txn.toXDR()}, error: `,
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
      const response = await this.addIssuersTrustLine(keypair, isTestnet);
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
      await this.addIssuersTrustLine(treasury, isTestnet);
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

      const networkType = isTestnet ? 'testnet' : 'public';
      const url = `https://api.stellar.expert/explorer/${networkType}/account/${address}/value`;

      const response = await fetch(url);
      if (response.status === 404) {
        const err: any = new Error('Not found');
        err.response = { status: 404 };
        throw err;
      }
      if (!response.ok) {
        throw new Error(`Stellar expert error: ${response.statusText}`);
      }

      const accountData = await response.json();

      const arsaIssuer: string = this.stellarConfig.arsa_issue_address;

      if (!arsaIssuer) {
        throw new NotFoundException(
          `ARSa issuer address or code not defined for mainnet`,
        );
      }

      let balanceXLM = '0';
      let balanceUSDC = '0';
      let balanceARSA = '0';
      let balanceUSDCprosper = '0';

      const usdcIssuer = isTestnet
        ? this.stellarConfig.usdc_issuer_address
        : this.stellarConfig.usdc_issuer_address_prod;

      const usdcProsperAssetString = 'CD2NVPKBQK3J42JABNAN3WRQITQMBH4TH2MNIEVAIMJEQ2HRJBVMVVWY';

      for (const b of accountData.balances || []) {
        if (b.asset === 'XLM') {
          balanceXLM = (Math.round(b.balance / 100000) / 100).toString();
        } else if (b.asset === usdcProsperAssetString) {
          balanceUSDCprosper = (Math.round(b.balance / 100000) / 100).toString();
        } else if (typeof b.asset === 'string') {
          if (b.asset.startsWith(`USDC-${usdcIssuer}-`)) {
            balanceUSDC = (Math.round(b.balance / 100000) / 100).toString();
          } else if (b.asset.startsWith(`ARSa-${arsaIssuer}-`)) {
            balanceARSA = (Math.round(b.balance / 100000) / 100).toString();
          }
        }
      }

      return { address, balanceXLM, balanceUSDC, balanceARSA, balanceUSDCprosper };
    } catch (error: any) {
      if (error?.response?.status === 404) {
        this.logger.warn(
          `Account ${payload.address} not found (unfunded). Returning 0 balances.`,
        );
        return {
          address: payload.address,
          balanceXLM: '0',
          balanceUSDC: '0',
          balanceARSA: '0',
          balanceUSDCprosper: '0',
        };
      }
      this.logger.error(`Error fetching account balances, error: `, error);
      throw new BadRequestException('Error fetching account balances');
    }
  }

  public async makeTransaction(
    payload: MakeProsperTransactionDto,
  ): Promise<MakeProsperTransactionResponse> {
    try {
      const { sourcePublicKey, sourcePrivateKey, receiverPublicKey, amount, isTestnet, memo } =
        payload;
      const server = this.getServer(isTestnet);
      const asset =
        payload.asset === 'USDC'
          ? this.getUSDCAsset(isTestnet)
          : this.getARSaAsset();
      const memoText = memo || ' ';

      if (payload.asset === 'ARSa' && !!isTestnet) {
        throw new BadRequestException('ARSa can only be transferred on mainet');
      }

      // verify receiver has PROSPER trustline
      // await this.verifyAccountProsper(receiverPublicKey, isTestnet);

      const sourceAccount = await server.loadAccount(sourcePublicKey);
      const sourceKeys = Keypair.fromSecret(sourcePrivateKey);

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

  /**
   * Obtiene el hash y monto del último pago válido en USDC o ARSa.
   * @param publicKey Dirección pública de Stellar a consultar.
   */
  async getLastAssetPayment(publicKey: string) {
    try {
      const server = this.getServer(false);
      const accountInfo = await server.loadAccount(publicKey);
      if (!accountInfo.balances || accountInfo.balances.length === 0) {
        throw new BadRequestException('La cuenta no tiene balances activos.');
      }
      const hasBalance = accountInfo.balances.some(b => parseFloat(b.balance) > 0);
      if (!hasBalance) {
        throw new BadRequestException('La cuenta tiene un balance igual a 0.');
      }
      const paymentsResponse = await server
        .payments()
        .forAccount(publicKey)
        .order('desc')
        .limit(50)
        .call();

      const usdcAsset = this.getUSDCAsset(false);
      const arsaAsset = this.getARSaAsset();

      for (const payment of paymentsResponse.records) {
        if ('asset_code' in payment) {
          const assetCode = payment.asset_code;
          const assetIssuer = payment.asset_issuer;

          const isOfficialUSDC = assetCode === usdcAsset.code && assetIssuer === usdcAsset.issuer;
          const isOfficialARSa = assetCode === arsaAsset.code && assetIssuer === arsaAsset.issuer;

          if (isOfficialUSDC || isOfficialARSa) {
            return {
              success: true,
              message: `Último pago verificado encontrado en ${assetCode}`,
              data: {
                hash: payment.transaction_hash,
                amount: payment.amount,
                asset: assetCode,
                issuer: assetIssuer,
                type: payment.type,
                from: payment.from,
                to: payment.to,
                createdAt: payment.created_at,
              },
            };
          }
        }
      }
      return {
        success: false,
        message: 'No se encontraron pagos recientes que coincidan con los emisores oficiales de USDC o ARSa.',
      };

    } catch (error: any) {
      this.logger.error(`Error procesando la cuenta de Stellar: ${error.message}`);
      throw error;
    }
  }

  async encryptStellarPrivateKey(payload: EncryptPrivateKeyDto): Promise<string> {
    try {
      const { privateKey } = payload;
      if (!privateKey || !Keypair.fromSecret(privateKey).publicKey()) {
        throw new BadRequestException('Invalid private key');
      }
      const encryptedPrivateKey = encryptPrivateKey({ privateKey });
      return encryptedPrivateKey;
    } catch (error) {
      this.logger.error(`Error encrypting private key, error: `, error);
      throw new BadRequestException('Error encrypting private key');
    }
  }
}
