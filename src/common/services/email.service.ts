import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class EmailService {
  private client: AxiosInstance;
  private readonly logger = new Logger(EmailService.name);

  private readonly urls = {
    sendOtpToken: '/email/verification-otp',
  };

  constructor(private readonly configService: ConfigService) {
    const baseURL = this.configService.get<string>('config.email.serviceUrl');
    if (!baseURL) {
      throw new Error('Email service URL is not defined');
    }

    this.client = axios.create({ baseURL });
  }

  async sendOtpEmail(email: string, token: string): Promise<void> {
    try {
      await this.client.post(this.urls.sendOtpToken, {
        to: email,
        code: token,
      });
      this.logger.log(`OTP email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}`, error.stack);
      throw error;
    }
  }
}
