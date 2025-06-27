import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AipriseService {
  private readonly aipriseKey: string;
  private readonly aipriseProfile: string;
  private readonly aipriseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const aiprise = this.configService.get('config.aiprise');
    this.aipriseKey = aiprise.key;
    this.aipriseProfile = aiprise.profile;
    this.aipriseUrl = aiprise.url;
  }

  logInfo() {
    console.log('Aiprise Key:', this.aipriseKey);
    console.log('Aiprise Profile:', this.aipriseProfile);
    console.log('Aiprise URL:', this.aipriseUrl);
  }
}
