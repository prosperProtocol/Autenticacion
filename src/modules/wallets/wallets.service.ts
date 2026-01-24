import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallets } from '../../entities/wallets';
import { CreateWalletDto, UpdateWalletDto } from './dto/wallets.dto';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallets)
    private readonly repo: Repository<Wallets>,
  ) {}

  async create(createDto: CreateWalletDto): Promise<Wallets> {
    const wallet = this.repo.create(createDto as any);
    const [savedWallet] = await this.repo.save(wallet);
    return await this.findOne(savedWallet.id);
  }

  findAll(): Promise<Wallets[]> {
    return this.repo.find();
  }

  async findOne(id: number): Promise<Wallets> {
    const wallet = await this.repo.findOne({ where: { id } });
    if (!wallet) throw new NotFoundException(`Wallet ${id} not found`);
    return wallet;
  }

  async findByFields(fields: Partial<Wallets>): Promise<Wallets[]> {
    return this.repo.find({ where: fields as any });
  }

  async update(id: number, updateDto: UpdateWalletDto): Promise<Wallets> {
    const wallet = await this.findOne(id);
    Object.assign(wallet, updateDto as any);
    return this.repo.save(wallet);
  }

  async remove(id: number): Promise<void> {
    const wallet = await this.findOne(id);
    await this.repo.remove(wallet);
  }
}
