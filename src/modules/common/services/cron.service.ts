import {
  Injectable,
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Auth, roleUser } from 'src/entities/auth.entity';
import { Wallets } from 'src/entities/wallets';

import { SorobanService } from 'src/common/services/soroban.service';
import { StakingService } from 'src/common/services/staking.service';
import { StellarService } from 'src/common/services/stellar.service';
import { ProsperCommonService } from './prosper.service';
import { WalletsService } from '../../wallets/wallets.service';
import { AuthJwtPayload } from '../../auth/auth.dto';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    @InjectRepository(Auth)
    private readonly authRepo: Repository<Auth>,
    private readonly prosperService: ProsperCommonService,
    private readonly sorobanService: SorobanService,
    private readonly stakingService: StakingService,
    private readonly stellarService: StellarService,
    private readonly walletsService: WalletsService,
  ) {}

  private async getWalletEmails(): Promise<
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

  async validateAdmin(payload: AuthJwtPayload): Promise<Auth> {
    const userId = Number(payload.sub);
    const user = await this.authRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.role !== roleUser.admin) {
      throw new UnauthorizedException('Unauthorized: Admin access required');
    }

    return user;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkCashinWalletsBalance() {
    this.logger.debug(
      'Iniciando cron para validar balance USDC de wallets con cashin',
    );
    try {
      const contractDetails = this.sorobanService.getSmartContractDetails();
      const wallets = await this.walletsService.findAll();
      const cashinWallets = wallets.filter(
        (w) => w.cashin === 'end' || w.cashin === 'month',
      );
      const walletEmails = await this.getWalletEmails();

      for (const wallet of cashinWallets) {
        try {
          const balance = await this.prosperService.getBalance(
            wallet.prosperId,
          );
          const walletEmailEntry = walletEmails.find(
            (we) => we.address === wallet.address,
          );
          const userEmail = walletEmailEntry ? walletEmailEntry.email : null;

          const arsaAmount = balance.balanceARSA;
          const usdcAmount = balance.balanceUSDC;
          // this.logger.debug(
          //   `[Cron] Wallet: ${wallet.prosperId}\n` +
          //     `Cashin: ${wallet.cashin}\n` +
          //     `ARSa: ${arsaAmount}\n` +
          //     `USDC: ${usdcAmount}`,
          // );

          if (Number(usdcAmount) > 0) {
            await this.processWalletCashin(
              'USDC',
              wallet,
              usdcAmount,
              usdcAmount,
              contractDetails,
              userEmail,
            );
          }

          if (Number(arsaAmount) > 0) {
            await this.processWalletCashin(
              'ARSa',
              wallet,
              arsaAmount,
              arsaAmount,
              contractDetails,
              userEmail,
            );
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

  private async processWalletCashin(
    asset: 'USDC' | 'ARSa',
    wallet: Wallets,
    stakingAmount: string | number,
    transferAmount: string | number,
    contractDetails: any,
    userEmail: string | null,
  ) {
    this.logger.debug(
      `[Cron] Transfiriendo ${transferAmount} ${asset} de ${wallet.prosperId} a treasury...`,
    );
    const txHashStellar = await this.stellarService.getLastAssetPayment(
      wallet.address,
    );

    if (!txHashStellar.success) {
      this.logger.error(
        `[Cron] No se pudo obtener el hash de la transacción de ${wallet.prosperId}: ${txHashStellar.message}`,
      );
      return;
    }
    const hashsDeposit = await this.stakingService.findbyHash(
      txHashStellar.data.hash,
    );
    if (hashsDeposit) {
      this.logger.debug(
        `[Cron] Ya existe un depósito con el hash ${txHashStellar.data.hash}`,
      );
      return;
    }
    await this.prosperService.transfer({
      asset,
      fromUserId: wallet.prosperId,
      toUserId: 'teasury',
      amount: transferAmount.toString(),
      prosperTxId: `cron-cashin-${wallet.id}-${Date.now()}`,
    });
    this.logger.debug(`[Cron] Transferencia completada exitosamente.`);

    this.logger.debug(
      `[Cron] Configurando estrategia con setStrat para ${wallet.prosperId}...`,
    );
    const stroopsAmount = Math.round(Number(stakingAmount) * 1e7).toString();
    const memo = Math.floor(Date.now() / 1000);
    const token_id = asset === 'USDC' ? 'USDCp' : 'ARSAp';

    this.logger.debug(
      `contractDetails.secret: ${contractDetails.secret} ` +
        `contractDetails.locking: ${contractDetails.locking} ` +
        `wallet.address: ${wallet.address} ` +
        `memo: ${memo} ` +
        `stroopsAmount: ${stroopsAmount} ` +
        `token_id: ${token_id}`,
    );

    const txHash = await this.sorobanService.setStrat(
      contractDetails.secret,
      contractDetails.locking,
      wallet.address,
      memo,
      stroopsAmount,
      token_id,
    );

    if (txHash) {
      this.logger.debug(`[Cron] setStrat exitoso con txHash: ${txHash}`);

      const start = new Date();
      const maturityPrincipal = new Date(start);
      if (wallet.cashin === 'end') {
        maturityPrincipal.setFullYear(maturityPrincipal.getFullYear() + 1);
      } else {
        maturityPrincipal.setMonth(maturityPrincipal.getMonth() + 1);
      }
      const tokenInteres = asset === 'USDC' ? 'USDCp' : 'ARSAp';
      const proximaFecha = new Date(start);
      proximaFecha.setDate(proximaFecha.getDate() + 1);
      const proximoMonto =
        Math.round((Number(stakingAmount) * 170000) / 365) / 1000000;

      await this.stakingService.create({
        email: userEmail ?? '',
        wallet: wallet.address,
        hashDeposito: txHashStellar.data.hash,
        hashStaking: txHash,
        memoStaking: memo,
        principalAmount: Number(transferAmount),
        start: start.toISOString(),
        maturityPrincipal: maturityPrincipal.toISOString(),
        scheduleInterest: [wallet.cashin],
        porcentajeAnual: 17,
        payoutAssetInterest: asset,
        payoutAssetPrincipal: asset,
        tokenInteres,
        contractoId: contractDetails.locking,
        claimedInterest: 0,
        principalRedeemed: 0,
        proximaFechaMonto: {
          fecha: proximaFecha,
          monto: proximoMonto,
        },
      });
      this.logger.debug(`[Cron] Registro de staking creado exitosamente.`);
    } else {
      this.logger.error(`[Cron] setStrat falló para ${wallet.prosperId}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async sendMaturedInterest() {
    this.logger.debug('Iniciando cron para enviar intereses maduros');
    const contractDetails = this.sorobanService.getSmartContractDetails();

    try {
      const stakingRecords = await this.stakingService.findAll();
      const registrosFiltrados = stakingRecords.filter(
        (sr) => new Date(sr.proximaFechaMonto?.fecha) <= new Date(),
      );
      this.logger.debug(
        `[Cron] Registros que cumplen la condición de fecha: ${JSON.stringify(registrosFiltrados)}`,
      );

      for (const staking of registrosFiltrados) {
        this.logger.debug(
          `[Cron] Procesando staking ID: ${staking.id}, Wallet: ${staking.wallet}`,
        );

        const proximaFecha = new Date(staking.proximaFechaMonto.fecha);
        proximaFecha.setDate(proximaFecha.getDate() + 1);

        this.logger.debug(
          `[Cron] Ejecutando accrue para ID: ${staking.id} por monto: ${staking.proximaFechaMonto.monto}`,
        );
        const txHash = await this.sorobanService.accrue(
          contractDetails.secret,
          contractDetails.locking,
          staking.wallet,
          staking.memoStaking,
          Math.round(Number(staking.proximaFechaMonto.monto) * 1e7).toString(),
        );
        this.logger.debug(
          `[Cron] Accrue completado para ID: ${staking.id}, txHash: ${txHash}`,
        );

        const interesCada24Horas = {
          fecha: new Date(),
          hash: txHash,
          monto: staking.proximaFechaMonto.monto,
        };

        // this.logger.debug(
        //   `[Cron] Actualizando registro de staking ID: ${staking.id}` +
        //     `interesCada24Horas: ${JSON.stringify(interesCada24Horas)}` +
        //     `proximaFechaMonto: ${JSON.stringify({
        //       fecha: proximaFecha,
        //       monto: staking.proximaFechaMonto.monto,
        //     })}`,
        // );
        await this.stakingService.update(staking.id, {
          interesesAcumulados:
            staking.interesesAcumulados + staking.proximaFechaMonto.monto,
          proximaFechaMonto: {
            fecha: proximaFecha,
            monto: staking.proximaFechaMonto.monto,
          },
          interesCada24Horas: [
            ...(staking.interesCada24Horas || []),
            interesCada24Horas,
          ],
        });
        this.logger.debug(
          `[Cron] Registro actualizado exitosamente para ID: ${staking.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Error al enviar intereses maduros',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
