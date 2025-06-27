import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  return {
    aiprise: {
      key: process.env.AIPRISE_ID_KEY,
      profile: process.env.AIPRISE_ID_PROFILE,
      template: process.env.AIPRISE_ID_TEMPLATE,
      cpfTemplate: process.env.AIPRISE_ID_TEMPLATE_CPF,
      latamTemplate: process.env.AIPRISE_ID_TEMPLATE_LATAM,
      pennyTemplate: process.env.AIPRISE_ID_TEMPLATE_PENNY,
      usTemplate: process.env.AIPRISE_ID_TEMPLATE_US,
      kybTemplate: process.env.AIPRISE_TEMPLATE_ID_KYB,
      url: process.env.AIPRISE_URL,
    },
    aws: {
      accessKeyId: process.env.BUCKETACCESSKEYID,
      secretAccessKey: process.env.BUCKETSECRETACCESSKEY,
      region: process.env.BUCKETREGION,
      bucket: process.env.BUCKETNAME,
    },
    database: {
      url: process.env.POSTGRES_DB_URL,
    },
    jwt: {
      secret: process.env.JWT_SECRET_KEY,
    },
    app: {
      port: parseInt(process.env.PORT, 10) || 3000,
      nodeEnv: process.env.NODE_ENV || 'develop',
    },
    email: {
      serviceUrl: process.env.EMAIL_SERVICE,
    },
    stellar: {
      collectingWallet: process.env.COLLECTING_WALLET,
      collectingSecret: process.env.COLLECTING_SECRET,
      usdcIssuerTestnet: process.env.USDC_ISSUER_ADDRESS_TESTNET,
      usdcIssuerMainnet: process.env.USDC_ISSUER_ADDRESS_MAINNET,
      xlmWalletSecret: process.env.XLM_WALLET_SECRET,
    },
  };
});
