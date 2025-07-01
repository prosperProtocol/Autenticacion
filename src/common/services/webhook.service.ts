import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Keypair } from '@stellar/stellar-sdk';
import axios from 'axios';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly dbConfig: any;
  private readonly stellarConfig: any;

  constructor(private readonly configService: ConfigService) {
    this.dbConfig = this.configService.get('dbConfig');
    this.stellarConfig = this.configService.get('stellarConfig');
  }

  async computeSignature(data: string): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signKey = this.stellarConfig?.anchor_signing_key;
    if (!signKey) {
      this.logger.error('Anchor signing key is not configured');
      throw new UnauthorizedException(`Solicitud No Autorizada`);
    }
    const payload = `${timestamp}.` + `${signKey}.` + data;
    const keypair: Keypair = Keypair.fromSecret(signKey);
    const signature = keypair.sign(Buffer.from(payload));
    const sep = '=';
    return `t${sep}${timestamp}, s${sep}${signature.toString('base64')}`;
  }

  async sendWebhook(baseUrl: string, params: any) {
    if (this.dbConfig.url.includes('localhost')) return null;
    const url = `https://${baseUrl}/webhook`;

    const options = {
      method: 'POST',
      url,
      headers: {
        Accept: `* /*`,
        Signature: await this.computeSignature(
          JSON.stringify(
            // eslint-disable-next-line prettier/prettier
            params,
            null,
            null,
          ),
        ),
      },
      // eslint-disable-next-line prettier/prettier
      data: params,
    };
    try {
      const resp = await axios.request(options);
      return { status: resp.status, data: resp.data };
    } catch (error) {
      this.logger.error(error);
      throw new UnauthorizedException(`Solicitud No autorizada`);
    }
  }
}
/**
enum StatusEnum {
  completed = 'completed',
  pending = 'pending',
  failed = 'failed',
}

enum TransactionEnum {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
}

const params = {
  id: txId,
  eventType: TransactionEnum.WITHDRAWAL,
  userAddress,  // Stellar Wallet Address Public Key
  date: txDate, // Date of the transaction
  amount, // Amount of the transaction
  AssetCode, // 'USDC'
  status, // Status of the transaction
  failReason?: failReason | null,
};
 */