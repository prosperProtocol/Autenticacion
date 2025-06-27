import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SkipJwtAuth } from 'src/common/decorators/skip-guard.decorator';


@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @SkipJwtAuth()
  @Get('/healthcheck')
  getHello(): object {
    return { code: 200, message: this.appService.getHello() };
  }
}
