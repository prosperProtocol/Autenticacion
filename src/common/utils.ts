import {
  Address,
  scValToBigInt,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import { Api } from '@stellar/stellar-sdk/rpc';

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
