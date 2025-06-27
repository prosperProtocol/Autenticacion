import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { createSignature } from 'src/common/utils/utils';

@Injectable()
export class AipriseStrategy {
  private readonly aipriseKey: string;
  constructor(private readonly configService: ConfigService) {
    const aiprise = this.configService.get('config.aiprise');
    this.aipriseKey = aiprise.key;
  }

  async validateCredentials(headers, body) {
    const X_HMAC_SIGNATURE = headers['x-hmac-signature'];

    if (!X_HMAC_SIGNATURE) {
      throw new BadRequestException();
    }

    await createSignature(body, this.aipriseKey);
    return true;
  }
}
