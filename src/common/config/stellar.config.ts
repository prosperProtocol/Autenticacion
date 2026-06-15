import { registerAs } from '@nestjs/config';

const is_testnet = false; // process.env.NODE_ENV === 'main' ? false : true;
// console.log('is_testnet', is_testnet);
const USDC_ISSUER_ADDRESS =
  'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const USDC_ISSUER_ADDRESS_PROD =
  'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

export default registerAs('stellarConfig', () => ({
  arsa_issue_code: process.env.ARSA_ISSUE_CODE,
  arsa_issue_address: process.env.ARSA_ISSUE_ADDRESS,
  arsa_contract_address: process.env.ARSA_CONTRACT_ADDRESS,
  base_fee: '50000',
  is_testnet,
  locking_contract_address: process.env.LOCKING_CONTRACT_ADDRESS,
  prosper_treasury_address: process.env.PROSPER_TREASURY_ADDRESS,
  prosper_treasury_secret: process.env.PROSPER_TREASURY_SECRET,
  prosper_treasury_address_prod: process.env.PROSPER_TREASURY_ADDRESS_PROD,
  prosper_treasury_secret_prod: process.env.PROSPER_TREASURY_SECRET_PROD,
  mainnet_url: 'https://horizon.stellar.org',
  smart_contract_admin: process.env.SMART_CONTRACT_ADMIN,
  smart_contract_secret:
    'ABDql6FIrNFRY2AO:0q+R0CdwNo0ANvDJD9h6VQ==:hxguhtbEjf5GvgYiVJOGMpXXktZsZUjReUU2IXTprKQXFTcABqB5I7l7XKpQtkfiUWn1NFhNVGo=', //process.env.SMART_CONTRACT_SECRET,
  soroban_fee: '3000000',
  soroban_url: 'https://mainnet.sorobanrpc.com',
  starting_balance: '3',
  testnet_url: 'https://horizon-testnet.stellar.org',
  timeout: 1800,
  token_contract_address_usdc:
    'CA7AUEOZT3RGFJX37VTNLVRRZ57SFEQWRDNRASLLX5TYOQY3FJ6AFZMJ', //process.env.TOKEN_CONTRACT_ADDRESS_USDCp,
  token_contract_address_arsa:
    'CACQBLU74W2S7JEG6M6EMBULSL3YWMPLPINSDYXGA2RZPZRZPYB5KB4U', //process.env.TOKEN_CONTRACT_ADDRESS_ARSAp,
  usdc_issuer_address: USDC_ISSUER_ADDRESS,
  usdc_issuer_address_prod: USDC_ISSUER_ADDRESS_PROD,
  xlm_wallet_public: process.env.XLM_WALLET_PUBLIC,
  xlm_wallet_secret:
    'n8VkCaGnsKmBmdbK:1rATEJ3NWZrxkYbRPlBv/A==:Ui2CyViz7RDDUBHv8Oj+xHkj5kABpKaTyVCh8xPZgl/CkVP+sfiKj0cd8jWOBksq3wOaAzS0xkQ=', //process.env.XLM_WALLET_SECRET,
}));
