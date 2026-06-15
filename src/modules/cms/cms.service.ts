import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Keypair } from '@stellar/stellar-sdk';
import * as bcrypt from 'bcrypt';
import { IsNull, Repository } from 'typeorm';

import { Auth, roleUser } from 'src/entities/auth.entity';

import { SorobanService } from 'src/common/services/soroban.service';
import { StakingService } from 'src/common/services/staking.service';
import { StellarService } from 'src/common/services/stellar.service';
import { AuthJwtPayload } from '../auth/auth.dto';
import { GetBalanceResponse } from '../common/dtos/prosper.dto';
import { ProsperCommonService } from '../common/services/prosper.service';
import { WalletsService } from '../wallets/wallets.service';
import { CheckTreasuryBalanceResponse } from './cms.dto';

@Injectable()
export class CMSService {
  private readonly logger = new Logger(CMSService.name);
  private readonly serverConfig: any;
  private readonly secret: string;

  constructor(
    @InjectRepository(Auth)
    private readonly authRepo: Repository<Auth>,
    private readonly configService: ConfigService,
    private readonly prosperService: ProsperCommonService,
    private readonly sorobanService: SorobanService,
    private readonly stakingService: StakingService,
    private readonly stellarService: StellarService,
    private readonly walletsService: WalletsService,
  ) {
    this.serverConfig = this.configService.get('stellarConfig');
    this.secret = this.configService.get<string>('ENCRYPTION_SECRET') ?? ' ';
  }

  async validateAdmin(payload: AuthJwtPayload): Promise<Auth> {
    const userId = Number(payload.sub);
    const user = await this.authRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.role !== roleUser.admin || !user.username.includes('prosperCMS')) {
      throw new UnauthorizedException('Unauthorized: Admin access required');
    }

    return user;
  }

  async mintUSDCprosper(address: string, amount: number) {
    if (amount < 1) {
      throw new BadRequestException('El monto debe ser mayor a 1');
    }
    const checkAccount = await this.stellarService.getAccountBalances({
      address,
      isTestnet: false,
    });
    if (!checkAccount.balanceXLM && checkAccount.balanceXLM <= '2.6') {
      this.logger.warn(`La dirección ${address} no tiene una cuenta activa`);
      throw new BadRequestException(
        `La dirección ${address} no tiene una cuenta activa`,
      );
    }
    return this.sorobanService.mintUSDCprosper(address, amount);
  }

  async burnUSDCprosper(address: string, amount: number, privateKey: string) {
    const checkAccount = await this.stellarService.getAccountBalances({
      address,
      isTestnet: false,
    });
    if (!checkAccount.balanceXLM && checkAccount.balanceXLM <= '2.6') {
      this.logger.warn(`La dirección ${address} no tiene una cuenta activa`);
      throw new BadRequestException(
        `La dirección ${address} no tiene una cuenta activa`,
      );
    }
    return this.sorobanService.burnUSDCprosper(address, amount, privateKey);
  }

  /**
   * Registra un usuario usando un correo electrónico como username
   */
  async createUser(email: string): Promise<number> {
    try {
      const existingUser = await this.authRepo.findOne({
        where: { username: email.toLowerCase() },
      });
      if (existingUser) {
        throw new BadRequestException('El usuario ya existe');
      }

      const hashedPassword = await bcrypt.hash('Alfred123*', 10);
      const newUser = this.authRepo.create({
        username: email.toLowerCase(),
        password: hashedPassword,
        role: roleUser.user,
        business: 'alfred',
      });

      const savedUser = await this.authRepo.save(newUser);
      return savedUser.id;
    } catch (error) {
      this.logger.error(
        'Error al crear usuario desde email',
        error instanceof Error ? error.message : String(error),
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al crear el usuario');
    }
  }

  public async getAllUserDetails() {
    try {
      const alfredPayUsers = await this.authRepo.query(`
        SELECT
          a.id AS "userId",
          a.username AS "email",
          w.address AS "address",
          w.cashin AS "cashin"
        FROM auth a
        LEFT JOIN wallets w
          ON w."prosperId" = CAST(a.id AS VARCHAR)
          AND w."prosperType" = 'id'
          AND w."deletedAt" IS NULL
        WHERE a."deletedAt" IS NULL
          AND a.business = 'alfred'
      `);

      const prosperUsers = await this.authRepo.query(`
        SELECT
          w."prosperId" as "prosperId",
          w.address AS "address",
          w.cashin AS "cashin"
        FROM wallets w
        WHERE w."prosperType" = 'prosper'
          AND w."deletedAt" IS NULL
      `);

      return { prosper: prosperUsers, alfred: alfredPayUsers };
    } catch (error) {
      this.logger.error(
        'Error al obtener detalles de usuarios',
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error al obtener detalles de usuarios');
    }
  }

  public async getWalletEmails(): Promise<
    { email: string; address: string }[]
  > {
    try {
      const results = await this.authRepo.query(`
        SELECT
          CASE
            WHEN wallet."prosperType" = 'id' THEN auth.username
            WHEN wallet."prosperType" = 'prosper' THEN 'prosper@cms.com'
          END AS "email",
          wallet.address AS "address"
        FROM wallets wallet
        LEFT JOIN auth auth
          ON wallet."prosperId" = CAST(auth.id AS VARCHAR)
          AND auth."deletedAt" IS NULL
        WHERE wallet."deletedAt" IS NULL
          AND wallet."prosperType" IN ('id', 'prosper')
      `);

      return results;
    } catch (error) {
      this.logger.error(
        'Error al obtener correos de las wallets',
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error al obtener correos de las wallets');
    }
  }

  public async cashin(payload: {
    prosperId: string;
    cashin: 'end' | 'month';
  }): Promise<GetBalanceResponse> {
    this.logger.debug('cashin called');
    try {
      const { prosperId, cashin } = payload;
      if (!cashin || (cashin !== 'end' && cashin !== 'month')) {
        throw new BadRequestException('cashin debe ser "end" o "month"');
      }
      const isTestnet = await this.stellarService.getIsTestnet();
      const wallets = await this.walletsService.findByFields({
        prosperId,
        cashin,
      });
      const wallet = wallets && wallets.length ? wallets[0] : null;
      if (!wallet) {
        const newWallet = Keypair.random();
        await this.stellarService.createAccountWithBalance(
          newWallet,
          isTestnet,
        );
        await this.stellarService.addIssuersTrustLine(newWallet, isTestnet);
        await this.walletsService.create({
          prosperId,
          prosperType: 'prosper',
          cashin,
          address: newWallet.publicKey(),
          secret: newWallet.secret(),
        });
        if (isTestnet) {
          this.logger.debug(`secret: ${newWallet.secret()}`);
        }
        return await this.prosperService.getBalanceByWallet(
          newWallet.publicKey(),
        );
      }
      return await this.prosperService.getBalanceByWallet(wallet.address);
    } catch (error) {
      this.logger.error(
        `Error en cashin: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException(
        'Error creando o verificando la wallet del usuario',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  public async getStakingRecords() {
    try {
      const stakings = await this.stakingService.findAll();
      // const wallets = await this.walletsService.findAll();
      // const users = await this.authRepo.find();

      // return stakings.map((staking) => {
      //   const wallet = wallets.find((w) => w.address === staking.wallet);
      //   // const user = wallet
      //   //   ? users.find((u) => u.id.toString() === wallet.prosperId)
      //   //   : null;
      //   return {
      //     ...staking,
      //     // email: user ? user.username : null,
      //   };
      // });
      // this.logger.debug(stakings);
      return stakings;
    } catch (error) {
      this.logger.error(
        'Error al obtener registros de staking con emails',
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException(
        'Error al obtener los registros de staking',
      );
    }
  }

  public async checkTreasuryBalance(): Promise<CheckTreasuryBalanceResponse> {
    this.logger.debug('checkTreasuryBalance called');
    try {
      const isTestnet = await this.stellarService.getIsTestnet();
      const treasury = this.stellarService.getProsperTeasury(isTestnet);
      if (!treasury) {
        throw new NotFoundException('Treasury account not found');
      }
      // this.logger.debug(`treasury: ${JSON.stringify(treasury)}`);
      const balanceTreasury = await this.stellarService.getAccountBalances({
        address: treasury.publicKey,
        isTestnet,
      });
      // this.logger.debug(`balanceTreasury: ${JSON.stringify(balanceTreasury)}`);
      const result = {
        treasury: {
          address: treasury.publicKey,
          balanceUSDC: balanceTreasury.balanceUSDC,
          balanceARSA: balanceTreasury.balanceARSA,
        },
      };
      // this.logger.debug(`Flujo variables: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error en checkTreasuryBalance: `,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException('Error obteniendo los activos de Prosper');
    }
  }
}
