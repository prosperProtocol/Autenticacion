import { Module } from '@nestjs/common';
import { ProsperController } from './prosper.controller';
import { ProsperService } from './prosper.service';

@Module({
  controllers: [ProsperController],
  providers: [ProsperService],
  exports: [ProsperService],
})
export class ProsperModule {}
