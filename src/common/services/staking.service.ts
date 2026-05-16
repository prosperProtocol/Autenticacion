import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Staking } from 'src/entities/staking.entity';
import { CreateStakingDto } from '../dto/staking.dto';

@Injectable()
export class StakingService {
  constructor(
    @InjectRepository(Staking)
    private readonly stakingRepository: Repository<Staking>,
  ) {}

  async create(createStakingDto: CreateStakingDto): Promise<Staking> {
    const staking = this.stakingRepository.create({
      ...createStakingDto,
      start: new Date(createStakingDto.start),
      maturityPrincipal: new Date(createStakingDto.maturityPrincipal),
    });
    return await this.stakingRepository.save(staking);
  }

  async findAll(): Promise<Staking[]> {
    return await this.stakingRepository.find();
  }

  async findOne(id: number): Promise<Staking | null> {
    return await this.stakingRepository.findOne({ where: { id } });
  }
}
