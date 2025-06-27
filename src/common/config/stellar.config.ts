import { registerAs } from '@nestjs/config';

const demo_wallet_url =
  process.env.STELLAR_ENV !== 'test' ? null : process.env.DEMO_WALLET_URL;
const is_testnet = process.env.STELLAR_ENV === 'test' ? true : false;
export default registerAs('stellarConfig', () => ({
  alfred_contract_address: process.env.ALFRED_CONTRACT_ADDRESS,
  anchor_signing_key: process.env.ANCHOR_SIGNING_KEY,
  soroban_url: 'https://mainnet.sorobanrpc.com',
  base_fee: '50000',
  demo_wallet_url,
  is_testnet,
  home_domain: process.env.HOME_DOMAIN,
  home_domain_anchor: process.env.HOME_DOMAIN_ANCHOR,
  mainnet_url: 'https://horizon.stellar.org',
  rampa_prod_api: process.env.RAMPA_PROD_API,
  rampa_prod_secret: process.env.RAMPA_PROD_SECRET,
  soroban_fee: '3000000',
  starting_balance: '3',
  stellar_url: process.env.STELLAR_URL,
  stellar_url_prod: process.env.STELLAR_URL_PROD,
  testnet_url: 'https://horizon-testnet.stellar.org',
  timeout: 1800,
  timeout_sep10: 300,
  usdc_contract_address: process.env.USDC_CONTRACT_ADDRESS,
  usdc_issuer_address: process.env.USDC_ISSUER_ADDRESS,
  usdc_issuer_address_prod: process.env.USDC_ISSUER_ADDRESS_PROD,
  xlm_wallet_secret: process.env.XLM_WALLET_SECRET,
  widget_url: process.env.WIDGET_URL,
  widget_wallet_secret: process.env.WIDGET_WALLET_SECRET,
}));
