import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AipriseService } from './aiprise.service';
import { AwsService } from './aws.service';
import { StellarService } from './stellar.service';
import { EmailService } from './email.service';

@Module({
  providers: [
    AipriseService,
    AwsService,
    EmailService,
    StellarService,
  ],
  exports: [
    AipriseService,
    AwsService,
    EmailService,
    StellarService,
  ],
})
export class ShareModule {}
