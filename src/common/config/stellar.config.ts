import { registerAs } from '@nestjs/config';

const is_testnet = !process.env.STELLAR_ENV ? true : false;
export default registerAs('stellarConfig', () => ({
  soroban_url: 'https://mainnet.sorobanrpc.com',
  base_fee: '50000',
  is_testnet,
  prosper_issuer_address: process.env.PROSPER_ISSUER_ADDRESS,
  prosper_issuer_address_prod: process.env.PROSPER_ISSUER_ADDRESS_PROD,
  prosper_treasury_address: process.env.PROSPER_TREASURY_ADDRESS,
  prosper_treasury_address_prod: process.env.PROSPER_TREASURY_ADDRESS_PROD,
  mainnet_url: 'https://horizon.stellar.org',
  soroban_fee: '3000000',
  starting_balance: '3',
  testnet_url: 'https://horizon-testnet.stellar.org',
  timeout: 1800,
  token_contract_admin: process.env.SMART_CONTRACT_ALFRED,
  token_contract_address: process.env.TOKEN_CONTRACT_ADDRESS,
  xlm_wallet_secret: process.env.XLM_WALLET_SECRET,
}));
