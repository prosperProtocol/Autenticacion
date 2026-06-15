import {
  Injectable,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import arsaConfig from '../config/arsa.config';

@Injectable()
export class ArsaService {
  constructor(
    @Inject(arsaConfig.KEY)
    private readonly arsaConf: ConfigType<typeof arsaConfig>,
  ) {}

  private getJwtoken(): string {
    try {
      const privateKey = this.arsaConf.api_private_key;
      return jwt.sign({}, privateKey, {
        algorithm: 'ES256',
        expiresIn: '2m',
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Error generating JWT token: ' + error.message,
      );
    }
  }

  async getCotization(): Promise<string> {
    try {
      const token = this.getJwtoken();
      const response = await fetch(
        `${this.arsaConf.api_url}international/cotization`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-api-key': this.arsaConf.api_key,
            'Content-Type': 'application/json',
          },
        },
      );

      const result = await response.json();

      if (result?.status === 200 && result?.data?.ars_usdt) {
        return result.data.ars_usdt;
      }

      throw new Error('Invalid response format or missing ars_usdt');
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to get cotization: ' + error.message,
      );
    }
  }
}
