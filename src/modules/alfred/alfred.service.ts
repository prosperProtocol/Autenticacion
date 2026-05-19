import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auth, roleUser } from '../../entities/auth.entity';
import { AuthJwtPayload } from '../auth/auth.dto';
import * as bcrypt from 'bcrypt';
import { Keypair } from '@stellar/stellar-sdk';
import { StellarService } from 'src/common/services/stellar.service';
import { WalletsService } from '../wallets/wallets.service';
import { ProsperService } from '../prosper/prosper.service';
import { GetBalanceResponse } from '../prosper/prosper.dto';
import { SorobanService } from '../../common/services/soroban.service';
import { StakingService } from 'src/common/services/staking.service';

@Injectable()
export class AlfredService {
  private readonly logger = new Logger(AlfredService.name);

  constructor(
    @InjectRepository(Auth)
    private readonly authRepo: Repository<Auth>,
    private readonly stellarService: StellarService,
    private readonly walletsService: WalletsService,
    private readonly prosperService: ProsperService,
    private readonly sorobanService: SorobanService,
    private readonly stakingService: StakingService,
  ) {}

  async validateAdmin(payload: AuthJwtPayload): Promise<Auth> {
    const userId = Number(payload.sub);
    const user = await this.authRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (
      user.role !== roleUser.admin ||
      !user.username.includes('@alfredpay.io')
    ) {
      throw new UnauthorizedException('Unauthorized: Admin access required');
    }

    return user;
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

  public async cashin(payload: {
    alfredEmail: string;
    cashin: 'end' | 'month';
  }): Promise<GetBalanceResponse> {
    this.logger.debug('cashin called');
    try {
      const { alfredEmail, cashin } = payload;
      if (!cashin || (cashin !== 'end' && cashin !== 'month')) {
        throw new BadRequestException('cashin debe ser "end" o "month"');
      }
      const user = await this.authRepo.findOne({
        where: { username: alfredEmail.toLowerCase() },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      const isTestnet = await this.stellarService.getIsTestnet();
      const wallets = await this.walletsService.findByFields({
        prosperId: user.id.toString(),
      });
      const wallet = wallets && wallets.length ? wallets[0] : null;
      if (!wallet) {
        const newWallet = Keypair.random();
        await this.stellarService.createAccountWithBalance(
          newWallet,
          isTestnet,
        );
        await this.stellarService.addUSDCTrustLine(newWallet, isTestnet);
        await this.walletsService.create({
          prosperId: user.id.toString(),
          cashin,
          address: newWallet.publicKey(),
          secret: newWallet.secret(),
        });
        this.logger.debug(
          `New wallet created for alfredEmail ${alfredEmail}: ` +
            `address ${newWallet.publicKey()}`,
        );
        if (isTestnet) {
          this.logger.debug(`secret: ${newWallet.secret()}`);
        }
      }
      return this.prosperService.getBalance(user.id.toString());
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
      const wallets = await this.walletsService.findAll();
      const users = await this.authRepo.find();

      return stakings.map((staking) => {
        const wallet = wallets.find((w) => w.address === staking.owner);
        const user = wallet
          ? users.find((u) => u.id.toString() === wallet.prosperId)
          : null;
        return {
          ...staking,
          email: user ? user.username : null,
        };
      });
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

  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkCashinWalletsBalance() {
    this.logger.log(
      'Iniciando cron para validar balance USDC de wallets con cashin',
    );
    try {
      const contractDetails = this.sorobanService.getSmartContractDetails();
      const wallets = await this.walletsService.findAll();
      const cashinWallets = wallets.filter(
        (w) => w.cashin === 'end' || w.cashin === 'month',
      );

      for (const wallet of cashinWallets) {
        try {
          const balance = await this.prosperService.getBalance(
            wallet.prosperId,
          );
          const usdcAmount = balance.balanceUSDC;
          this.logger.log(
            `[Cron] Wallet: ${wallet.prosperId} | Cashin: ${wallet.cashin} | USDC: ${usdcAmount}`,
          );

          if (Number(usdcAmount) > 0) {
            this.logger.log(
              `[Cron] Transfiriendo ${usdcAmount} USDC de ${wallet.prosperId} a treasury...`,
            );
            await this.prosperService.transfer({
              fromUserId: wallet.prosperId,
              toUserId: 'teasury',
              amount: usdcAmount,
              prosperTxId: `cron-cashin-${wallet.id}-${Date.now()}`,
            });
            this.logger.log(`[Cron] Transferencia completada exitosamente.`);

            this.logger.log(
              `[Cron] Configurando estrategia con setStrat para ${wallet.prosperId}...`,
            );
            const stroopsAmount = Math.round(
              Number(usdcAmount) * 1e7,
            ).toString();
            const txHash = await this.sorobanService.setStrat(
              contractDetails.secret,
              contractDetails.locking,
              wallet.address,
              stroopsAmount,
            );

            if (txHash) {
              this.logger.log(`[Cron] setStrat exitoso con txHash: ${txHash}`);

              const start = new Date();
              const maturityPrincipal = new Date(start);
              if (wallet.cashin === 'end') {
                maturityPrincipal.setFullYear(maturityPrincipal.getFullYear() + 1);
              } else {
                maturityPrincipal.setMonth(maturityPrincipal.getMonth() + 1);
              }

              await this.stakingService.create({
                hash: txHash,
                owner: wallet.address,
                principalAmount: Number(usdcAmount),
                start: start.toISOString(),
                maturityPrincipal: maturityPrincipal.toISOString(),
                scheduleInterest: [wallet.cashin],
                rate: 17,
                payoutAssetInterest: 'USDC',
                payoutAssetPrincipal: 'USDC',
                claimedInterest: 0,
                principalRedeemed: 0,
              });
              this.logger.log(`[Cron] Registro de staking creado exitosamente.`);
            } else {
              this.logger.error(
                `[Cron] setStrat falló para ${wallet.prosperId}`,
              );
            }
          }
        } catch (err) {
          this.logger.error(
            `[Cron] Error obteniendo balance de ${wallet.prosperId}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Error al ejecutar cron checkCashinWalletsBalance',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
