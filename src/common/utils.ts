import * as crypto from 'crypto';
import { BadRequestException } from '@nestjs/common';
import {
  Address,
  scValToBigInt,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import { Api } from '@stellar/stellar-sdk/rpc';
import { DecryptPrivateKeyOptions, EncryptPrivateKeyDto } from './dto/crypto.dto';

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function getDiagnosticEventMetadata(
  tx: Api.GetSuccessfulTransactionResponse,
): { contract: string; topics: string[]; data: bigint } | null {
  try {
    if (!tx?.resultMetaXdr) {
      console.warn('No resultMetaXdr found in the transaction response.');
      return null;
    }
    const resultMetaXdr: xdr.TransactionMeta = tx?.resultMetaXdr;
    if (
      !resultMetaXdr ||
      !resultMetaXdr['_value']?.['_attributes']?.['diagnosticEvents']
    ) {
      console.warn('No diagnostic events found in the transaction result.');
      return null;
    }
    const diagnosticEvents: xdr.DiagnosticEvent[] =
      resultMetaXdr['_value']['_attributes']['diagnosticEvents'];
    if (!diagnosticEvents || diagnosticEvents.length === 0) {
      console.warn('No diagnostic events found in the transaction result.');
      return null;
    }
    const eventWithContract = diagnosticEvents.find((event) => {
      const contractEvent = event['_attributes']?.['event'] as
        | xdr.ContractEvent
        | undefined;
      return contractEvent?.contractId();
    });
    if (!eventWithContract) {
      console.warn('No contract event found in diagnostic events.');
      return null;
    }
    const contractEvent = eventWithContract['_attributes']['event'] as
      | xdr.ContractEvent
      | undefined;
    if (!contractEvent) {
      console.warn('Contract event is missing or malformed.');
      return null;
    }
    const contractId = contractEvent.contractId() as any;
    if (!contractId) {
      console.warn('Contract ID is missing in the contract event.');
      return null;
    }
    const contract = Address.contract(contractId).toString();
    const eventBody =
      contractEvent['_attributes']['body'].value()['_attributes'];
    if (!eventBody) {
      console.warn('Event body is missing or malformed.');
      return null;
    }
    const topics = eventBody.topics.map((topic: any) => scValToNative(topic));
    const eventData = scValToNative(eventBody.data);
    return {
      contract,
      topics,
      data: eventData as bigint,
    };
  } catch (error) {
    console.error('Error extracting diagnostic event metadata:', error);
    return null;
  }
}

export function decryptPrivateKey(
  encryptedValue: string | undefined,
  options?: DecryptPrivateKeyOptions,
): string | null {
  const throwOnError = Boolean(options?.throwOnError);
  const secret = process.env.ENCRYPTION_SECRET;

  if (!encryptedValue) {
    options?.logger?.warn?.('decryptPrivateKey: privateKeyEncrypted vacio');
    if (throwOnError) {
      throw new BadRequestException(
        'privateKeyEncrypted vacio para wallet del cliente',
      );
    }
    return null;
  }
  if (!secret) {
    throw new BadRequestException('Falta secreto para encriptar privateKey');
  }

  const parts = encryptedValue.split(':');
  if (parts.length !== 3) {
    options?.logger?.error?.(
      'decryptPrivateKey: formato invalido de privateKeyEncrypted',
    );
    if (throwOnError) {
      throw new BadRequestException(
        'Formato invalido de privateKeyEncrypted',
      );
    }
    return null;
  }

  try {
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const encrypted = Buffer.from(parts[2], 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch (error) {
    options?.logger?.error?.(
      'decryptPrivateKey: no se pudo desencriptar',
      error as any,
    );
    if (throwOnError) {
      throw new BadRequestException('No se pudo desencriptar privateKey');
    }
    return null;
  }
}

export function encryptPrivateKey(payload: EncryptPrivateKeyDto): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new BadRequestException('Falta secreto para encriptar privateKey');
  }
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(payload.privateKey, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

