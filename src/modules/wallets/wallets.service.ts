import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallets } from '../../entities/wallets';
import { CreateWalletDto, UpdateWalletDto } from './dto/wallets.dto';

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);
  constructor(
    @InjectRepository(Wallets)
    private readonly repo: Repository<Wallets>,
  ) {}

  async create(createDto: CreateWalletDto): Promise<Wallets> {
    this.logger.debug('llamando create');
    try {
      const wallet = this.repo.create(createDto);
      const savedWallet = await this.repo.save(wallet);
      return await this.findOne(savedWallet.id);
    } catch (error) {
      this.logger.error(
        `Error en create: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error creando la wallet');
    }
  }

  findAll(): Promise<Wallets[]> {
    this.logger.debug('llamando findAll');
    try {
      return this.repo.find();
    } catch (error) {
      this.logger.error(
        `Error en findAll: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error obteniendo las wallets');
    }
  }

  async findOne(id: number): Promise<Wallets> {
    this.logger.debug('llamando findOne');
    try {
      const wallet = await this.repo.findOne({ where: { id } });
      if (!wallet) throw new NotFoundException(`Wallet ${id} not found`);
      return wallet;
    } catch (error) {
      this.logger.error(
        `Error en findOne: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error obteniendo la wallet');
    }
  }

  async findByFields(fields: Partial<Wallets>): Promise<Wallets[]> {
    this.logger.debug('llamando findByFields');
    try {
      return this.repo.find({ where: fields });
    } catch (error) {
      this.logger.error(
        `Error en findByFields: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error obteniendo las wallets');
    }
  }

  async update(id: number, updateDto: UpdateWalletDto): Promise<Wallets> {
    this.logger.debug('llamando update');
    try {
      const wallet = await this.findOne(id);
      Object.assign(wallet, updateDto);
      return this.repo.save(wallet);
    } catch (error) {
      this.logger.error(
        `Error en update: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error actualizando la wallet');
    }
  }

  async remove(id: number): Promise<void> {
    this.logger.debug('llamando remove');
    try {
      const wallet = await this.findOne(id);
      await this.repo.remove(wallet);
    } catch (error) {
      this.logger.error(
        `Error en remove: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error eliminando la wallet');
    }
  }
}
