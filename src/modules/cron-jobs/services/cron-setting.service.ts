import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CronSetting } from 'src/entities/cronSetting.entity';

/**
 * CronSettingService — Lectura de variables de configuración desde la tabla `cron_setting`.
 *
 * Permite ajustar parámetros operacionales en caliente (sin redeploy):
 *   UPDATE cron_setting SET value = '100' WHERE key = 'PROSPER_TX_BATCH_SIZE';
 *
 * Todos los métodos tienen un `fallback` hardcodeado para que el sistema funcione
 * incluso si la BD no tiene el registro o hay un error de conexión transitorio.
 */
@Injectable()
export class CronSettingService {
  private readonly logger = new Logger(CronSettingService.name);

  constructor(
    @InjectRepository(CronSetting)
    private readonly repo: Repository<CronSetting>,
  ) {}

  /**
   * Lee un valor de texto desde cron_setting.
   * Retorna `fallback` si la key no existe o hay error.
   */
  async getString(key: string, fallback: string): Promise<string> {
    try {
      const row = await this.repo.findOne({ where: { key } });
      return row?.value ?? fallback;
    } catch (err) {
      this.logger.warn(`CronSettingService.getString key=${key} — usando fallback="${fallback}"`, err);
      return fallback;
    }
  }

  /**
   * Lee un valor booleano desde cron_setting.
   * Solo reconoce los literales 'true' y 'false'; cualquier otro valor retorna `fallback`.
   */
  async getBoolean(key: string, fallback: boolean): Promise<boolean> {
    const raw = await this.getString(key, String(fallback));
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    this.logger.warn(`CronSettingService.getBoolean key=${key} valor inválido="${raw}" — usando fallback=${fallback}`);
    return fallback;
  }

  /**
   * Lee un valor entero desde cron_setting.
   * Retorna `fallback` si el valor no es un entero válido.
   */
  async getInt(key: string, fallback: number): Promise<number> {
    const raw = await this.getString(key, String(fallback));
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) {
      this.logger.warn(`CronSettingService.getInt key=${key} valor inválido="${raw}" — usando fallback=${fallback}`);
      return fallback;
    }
    return parsed;
  }
}
