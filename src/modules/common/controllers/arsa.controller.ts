import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ArsaService } from 'src/common/services/arsa.service';
import { JwtGuard } from '../../auth/auth-jwt.guard';

@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('common/arsa')
export class ArsaController {
  constructor(private readonly arsaService: ArsaService) { }

  @Get('cotization')
  async getCotization() {
    return this.arsaService.getCotization();
  }
}
