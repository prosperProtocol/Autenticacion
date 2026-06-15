import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TempLogProsper } from '../../entities/tempLogProsper.entity';
import { Repository } from 'typeorm/repository/Repository';

@Injectable()
export class TempLogService {
  constructor(
    @InjectRepository(TempLogProsper)
    private readonly tempLogRepository: Repository<TempLogProsper>,
  ) {}

  async createTempLog(data: Partial<TempLogProsper>): Promise<TempLogProsper> {
    const tempLog = this.tempLogRepository.create(data);
    return this.tempLogRepository.save(tempLog);
  }
}
