import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Contract,
  Keypair,
  nativeToScVal,
  scValToNative,
  Networks,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { Api, Server } from '@stellar/stellar-sdk/rpc';
import { decryptPrivateKey } from '../utils';
// import { getDiagnosticEventMetadata } from '../utils';

@Injectable()
export class SorobanService {
  private readonly stellarConfig: any;
  private readonly logger = new Logger(SorobanService.name);
  private readonly networkPassphrase = Networks.PUBLIC;
  private readonly sorobanServer: Server;

  constructor(private readonly configService: ConfigService) {
    this.stellarConfig = this.configService.get('stellarConfig');
    this.sorobanServer = new Server('https://mainnet.sorobanrpc.com');
  }

  public checkNetwork(): boolean {
    return this.stellarConfig.is_testnet;
  }

  public getSmartContractDetails(): {
    admin: string;
    locking: string;
    secret: string;
    usdcToken: string;
    arsaToken: string;
  } {
    const admin = this.stellarConfig.smart_contract_admin;
    const locking = this.stellarConfig.locking_contract_address;
    const secretEncrypted = this.stellarConfig.smart_contract_secret;
    const secret = decryptPrivateKey(secretEncrypted);
    const usdcToken = this.stellarConfig.token_contract_address_usdc;
    const arsaToken = this.stellarConfig.token_contract_address_arsa;
    if (!admin) {
      this.logger.warn(`Verificar con Infra Variable de Entorno Admin`);
      throw new BadRequestException();
    }
    if (!locking) {
      this.logger.warn(`Verificar con Infra Variable de Entorno Locking`);
      throw new BadRequestException();
    }
    if (!secret) {
      this.logger.warn(`Verificar con Infra Variable de Entorno Secret`);
      throw new BadRequestException();
    }
    if (!usdcToken || !arsaToken) {
      this.logger.warn(`Verificar con Infra Variable de Entorno Token`);
      throw new BadRequestException();
    }
    return { admin, locking, secret, usdcToken, arsaToken };
  }

  public getLockingArsaContract(): string {
    const locking = this.stellarConfig.locking_contract_address;
    if (!locking) {
      this.logger.warn(`Verificar con Infra Variable de Entorno Locking`);
      throw new BadRequestException();
    }
    return locking;
  }

  private async invokeSorobanContract(
    secret: string,
    contractId: string,
    functionName: string,
    scvalParams: any[],
    sourcePublicKey?: string,
  ): Promise<string | null> {
    if (!secret || !functionName || !Array.isArray(scvalParams)) {
      this.logger.warn('Parámetros inválidos para invocar el contrato Soroban');
      return null;
    }
    if (this.checkNetwork()) {
      this.logger.warn('Invocación de contrato solo permitida en producción');
      return null;
    }
    try {
      const keypair = Keypair.fromSecret(secret);
      const baseSecret = decryptPrivateKey(
        'bfUmmZyNNXJ75xWM:irq3Rkh6J3a5qNzqtoOt6w==:C49PrDAlT5uWu/zQCMZE59Rq2MtvW6W596nFbEia29WSwHmrGYb37YFt+QuGukOdNWb1ANGcI3Y=',
      );
      // this.logger.debug('baseSecret', baseSecret)
      const baseKeypair = Keypair.fromSecret(baseSecret);
      const accountPublicKey = sourcePublicKey || keypair.publicKey();
      const account = await this.sorobanServer.getAccount(accountPublicKey);
      const contract = new Contract(contractId);
      const operation = contract.call(functionName, ...scvalParams);
      const transaction = new TransactionBuilder(account, {
        fee: this.stellarConfig.base_fee,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();
      const preppedTx =
        await this.sorobanServer.prepareTransaction(transaction);
      preppedTx.sign(baseKeypair);
      preppedTx.sign(keypair);
      const sendTx = await this.sorobanServer.sendTransaction(preppedTx);
      // this.logger.debug('sendTx', sendTx);
      if (sendTx.status !== 'PENDING') {
        this.logger.warn(`Transaction failed with status: ${sendTx.status}`);
        return null;
      }
      return sendTx.hash;
    } catch (error: any) {
      this.logger.error(error);
      this.logger.error(
        `Error invoking Soroban contract: ${error.message}`,
        error.stack,
      );
      if (error.response) {
        this.logger.error(
          `Soroban response: ${JSON.stringify(error.response)}`,
        );
      }
      return null;
    }
  }

  public async getResultSorobanContract(transactionHash: string): Promise<any> {
    try {
      const finalStatus = await this.sorobanServer.pollTransaction(
        transactionHash,
        {
          sleepStrategy: (_iter: number) => 500,
          attempts: 10,
        },
      );
      switch (finalStatus.status) {
        case 'FAILED':
          return {
            status: finalStatus.status,
            txHash: finalStatus.txHash,
            returnValue: null,
          };
        case 'NOT_FOUND':
          this.logger.warn(
            `Transaction failed with final status: ${finalStatus.status}`,
          );
          return null;
        case 'SUCCESS': {
          let returnValue = undefined;
          if (finalStatus.returnValue) {
            // this.logger.debug('Return value:', finalStatus.returnValue);
            const nativeVal = scValToNative(finalStatus.returnValue);
            returnValue =
              typeof nativeVal === 'bigint' ? nativeVal.toString() : nativeVal;
          }
          return {
            status: finalStatus.status,
            txHash: finalStatus.txHash,
            returnValue,
          };
        }
        default:
          this.logger.warn(
            `Transaction pending or unknown status: ${JSON.stringify(finalStatus)}`,
          );
          return null;
      }
    } catch (error: any) {
      this.logger.error(
        `Error getting result from Soroban contract: ${error.message}`,
        error.stack,
      );
      if (error.response) {
        this.logger.error(
          `Soroban response: ${JSON.stringify(error.response)}`,
        );
      }
      return null;
    }
  }

  async getBalanceUSDCprosper(id: string) {
    const details = this.getSmartContractDetails();
    const scvalParams = [nativeToScVal(id, { type: 'address' })];
    const txHash = await this.invokeSorobanContract(
      details.secret,
      details.usdcToken,
      'balance',
      scvalParams,
    );
    if (!txHash) {
      this.logger.warn(`Error al obtener el balance de USDCprosper`);
      return null;
    }
    const result = await this.getResultSorobanContract(txHash);
    if (!result) {
      this.logger.warn(`Error al obtener el balance de USDCprosper`);
      return null;
    }
    const stroopsAmount = result.returnValue;
    const usdcValue = Number(stroopsAmount) / 1e7;
    return usdcValue;
  }

  async mintUSDCprosper(to: string, amount: number) {
    const details = this.getSmartContractDetails();
    const stroopsAmount = Math.round(Number(amount) * 1e7).toString();
    const scvalParams = [
      nativeToScVal(to, { type: 'address' }),
      nativeToScVal(stroopsAmount, { type: 'i128' }),
    ];
    const txHash = await this.invokeSorobanContract(
      details.secret,
      details.usdcToken,
      'mint',
      scvalParams,
    );
    if (!txHash) {
      this.logger.warn(`Error al realizar el mint de USDCprosper`);
      return null;
    }
    const result = await this.getResultSorobanContract(txHash);
    if (!result) {
      this.logger.warn(`Error al realizar el mint de USDCprosper`);
      return null;
    }
    // this.logger.debug(`Mint USDCprosper result: ${JSON.stringify(result)}`);
    return { status: result.status, hash: result.txHash };
  }

  async burnUSDCprosper(from: string, amount: number, privateKey: string) {
    const details = this.getSmartContractDetails();
    const stroopsAmount = Math.round(Number(amount) * 1e7).toString();
    const scvalParams = [
      nativeToScVal(from, { type: 'address' }),
      nativeToScVal(stroopsAmount, { type: 'i128' }),
    ];
    const txHash = await this.invokeSorobanContract(
      privateKey,
      details.usdcToken,
      'burn',
      scvalParams,
      from,
    );
    if (!txHash) {
      this.logger.warn(`Error al quemar USDCprosper`);
      return null;
    }
    const result = await this.getResultSorobanContract(txHash);
    if (!result) {
      this.logger.warn(`Error al quemar USDCprosper`);
      return null;
    }
    // this.logger.debug(`Quemar USDCprosper result: ${JSON.stringify(result)}`);
    return { status: result.status, hash: result.txHash };
  }

  /**
   * Llama al contrato de rendimiento asociado para configurar un porcentaje de rendimiento.
   * Internamente se autentica con la cuenta del administrador.
   *
   * @param sourceSecret El secreto de la cuenta (administrador) que llama a la función.
   * @param contractId El ID del contrato.
   * @param pct El porcentaje a establecer.
   */
  async setPct(
    sourceSecret: string,
    contractId: string,
    pct: number,
  ): Promise<string | null> {
    const scvalParams = [nativeToScVal(pct, { type: 'u32' })];
    return this.invokeSorobanContract(
      sourceSecret,
      contractId,
      'set_pct',
      scvalParams,
    );
  }

  /**
   * Establece o inicializa una estrategia de staking/bloqueo para un usuario en particular con un monto definido,
   * interactuando con el contrato de rendimiento.
   *
   * @param sourceSecret El secreto de la cuenta que llama a la función.
   * @param contractId El ID del contrato.
   * @param user La dirección del usuario dueño de la estrategia.
   * @param memo El identificador único de la estrategia (timestamp).
   * @param amount El monto asociado a la estrategia.
   */
  async setStrat(
    sourceSecret: string,
    contractId: string,
    user: string,
    memo: number,
    amount: string,
    token_id: string,
  ): Promise<string | null> {
    const scvalParams = [
      nativeToScVal(user, { type: 'address' }),
      nativeToScVal(memo, { type: 'u64' }),
      nativeToScVal(amount, { type: 'i128' }),
      nativeToScVal(token_id, { type: 'symbol' }),
    ];
    const sourcePublicKey = this.getSmartContractDetails().admin;
    return this.invokeSorobanContract(
      sourceSecret,
      contractId,
      'set_strat',
      scvalParams,
      sourcePublicKey,
    );
  }

  /**
   * Obtiene todas las estrategias de un usuario.
   *
   * @param sourceSecret El secreto de la cuenta que llama a la función.
   * @param contractId El ID del contrato.
   * @param user La dirección del usuario consultado.
   */
  async getAllStrats(
    sourceSecret: string,
    contractId: string,
    user: string,
  ): Promise<string | null> {
    const scvalParams = [nativeToScVal(user, { type: 'address' })];
    const sourcePublicKey = this.getSmartContractDetails().admin;
    const txHash = await this.invokeSorobanContract(
      sourceSecret,
      contractId,
      'get_all_strats',
      scvalParams,
      sourcePublicKey,
    );
    if (!txHash) {
      this.logger.warn(`Error al obtener todas las Estadisticas de ${user}`);
      return null;
    }
    const result = await this.getResultSorobanContract(txHash);
    if (!result) {
      this.logger.warn(`Error al obtener todas las Estadisticas de ${user}`);
      return null;
    }
    this.logger.debug(`Todas las Estadisticas de ${user}:`, result);
    return result.returnValue;
  }

  /**
   * Obtiene la estrategia de un usuario.
   *
   * @param sourceSecret El secreto de la cuenta que llama a la función.
   * @param contractId El ID del contrato.
   * @param user La dirección del usuario consultado.
   * @param memo El identificador único de la estrategia (timestamp).
   */
  async getStrat(
    sourceSecret: string,
    contractId: string,
    user: string,
    memo: number,
  ): Promise<string | null> {
    const sourcePublicKey = this.getSmartContractDetails().admin;
    const scvalParams = [
      nativeToScVal(user, { type: 'address' }),
      nativeToScVal(memo, { type: 'u64' }),
    ];
    return this.invokeSorobanContract(
      sourceSecret,
      contractId,
      'get_strat',
      scvalParams,
      sourcePublicKey,
    );
  }

  /**
   * Verifica y finaliza la estrategia de staking de un usuario. Revisa si la fecha actual (now) supera la fecha de
   * expiración (expires_at). Si la estrategia sigue activa, lanza el error YieldError::StrategyStillActive.
   * Si ya venció, cambia su estado invocando set_s_exp_y.
   *
   * @param sourceSecret El secreto de la cuenta que llama a la función.
   * @param contractId El ID del contrato.
   * @param user La dirección del usuario cuya estrategia será verificada.
   * @param memo El identificador único de la estrategia (timestamp).
   */
  async endStkg(
    sourceSecret: string,
    contractId: string,
    user: string,
    memo: number,
  ): Promise<string | null> {
    const scvalParams = [
      nativeToScVal(user, { type: 'address' }),
      nativeToScVal(memo, { type: 'u64' }),
    ];
    return this.invokeSorobanContract(
      sourceSecret,
      contractId,
      'end_stkg',
      scvalParams,
    );
  }

  /**
   * Consulta el contrato de distribución para obtener el rendimiento anual porcentual (APY) o el acumulado
   * correspondiente a la estrategia de un usuario. Retorna un i128 (El valor numérico del APY o los rendimientos).
   *
   * @param sourceSecret El secreto de la cuenta que llama a la función.
   * @param contractId El ID del contrato.
   * @param user La dirección del usuario consultado.
   * @param memo El identificador único de la estrategia (timestamp).
   */
  async getApy(
    sourceSecret: string,
    contractId: string,
    user: string,
    memo: number,
  ): Promise<string | null> {
    const scvalParams = [
      nativeToScVal(user, { type: 'address' }),
      nativeToScVal(memo, { type: 'u64' }),
    ];
    return this.invokeSorobanContract(
      sourceSecret,
      contractId,
      'get_apy',
      scvalParams,
    );
  }

  /**
   * Añade o acumula una cierta cantidad de rendimiento/fondos a favor de un usuario,
   * delegando la acción al contrato de distribución.
   *
   * @param sourceSecret El secreto de la cuenta que llama a la función.
   * @param contractId El ID del contrato.
   * @param user La dirección del usuario al cual se le acumulará el monto.
   * @param memo El identificador único de la estrategia (timestamp).
   * @param amount La cantidad de fondos o rendimientos a acumular.
   */
  async accrue(
    sourceSecret: string,
    contractId: string,
    user: string,
    memo: number,
    amount: string,
  ): Promise<string | null> {
    const sourcePublicKey = this.getSmartContractDetails().admin;
    const scvalParams = [
      nativeToScVal(user, { type: 'address' }),
      nativeToScVal(memo, { type: 'u64' }),
      nativeToScVal(amount, { type: 'i128' }),
    ];
    return this.invokeSorobanContract(
      sourceSecret,
      contractId,
      'accrue',
      scvalParams,
      sourcePublicKey,
    );
  }

  /**
   * Cambia de forma manual/directa el estado de la estrategia de un usuario a
   * Expirada (StrategyStatus::Expired) a través del cliente de distribución.
   *
   * @param sourceSecret El secreto de la cuenta que llama a la función.
   * @param contractId El ID del contrato.
   * @param user La dirección del usuario.
   * @param memo El identificador único de la estrategia (timestamp).
   */
  async setSExp(
    sourceSecret: string,
    contractId: string,
    user: string,
    memo: number,
  ): Promise<string | null> {
    const scvalParams = [
      nativeToScVal(user, { type: 'address' }),
      nativeToScVal(memo, { type: 'u64' }),
    ];
    return this.invokeSorobanContract(
      sourceSecret,
      contractId,
      'set_s_exp',
      scvalParams,
    );
  }

  /**
   * Cambia el estado de la estrategia de un usuario a Completada
   * (StrategyStatus::Completed) usando el contrato de distribución.
   *
   * @param sourceSecret El secreto de la cuenta que llama a la función.
   * @param contractId El ID del contrato.
   * @param user La dirección del usuario.
   * @param memo El identificador único de la estrategia (timestamp).
   */
  async setSCmp(
    sourceSecret: string,
    contractId: string,
    user: string,
    memo: number,
  ): Promise<string | null> {
    const scvalParams = [
      nativeToScVal(user, { type: 'address' }),
      nativeToScVal(memo, { type: 'u64' }),
    ];
    return this.invokeSorobanContract(
      sourceSecret,
      contractId,
      'set_s_cmp',
      scvalParams,
    );
  }

  /**
   * Ejecuta el retiro de fondos o rendimientos para un usuario. Primero invoca withdraw en el contrato de rendimiento y,
   * si es exitoso, transfiere el monto equivalente en el token USDC desde la cuenta del administrador hacia la cuenta del usuario.
   *
   * @param sourceSecret El secreto de la cuenta que llama a la función.
   * @param contractId El ID del contrato.
   * @param amount La cantidad que el usuario va a retirar.
   * @param user La dirección del usuario que recibe la transferencia.
   * @param memo El identificador único de la estrategia (timestamp).
   */
  async withdraw(
    sourceSecret: string,
    contractId: string,
    amount: string,
    user: string,
    memo: number,
    token_id: string,
  ): Promise<string | null> {
    const scvalParams = [
      nativeToScVal(amount, { type: 'i128' }),
      nativeToScVal(user, { type: 'address' }),
      nativeToScVal(memo, { type: 'u64' }),
      nativeToScVal(token_id, { type: 'symbol' }),
    ];
    return this.invokeSorobanContract(
      sourceSecret,
      contractId,
      'withdraw',
      scvalParams,
    );
  }
}
