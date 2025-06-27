import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Aiprise
  AIPRISE_ID_KEY: Joi.string().required(),
  AIPRISE_ID_PROFILE: Joi.string().uuid().required(),
  AIPRISE_ID_TEMPLATE: Joi.string().uuid().required(),
  AIPRISE_ID_TEMPLATE_CPF: Joi.string().uuid().required(),
  AIPRISE_ID_TEMPLATE_LATAM: Joi.string().uuid().required(),
  AIPRISE_ID_TEMPLATE_PENNY: Joi.string().uuid().required(),
  AIPRISE_ID_TEMPLATE_US: Joi.string().uuid().required(),
  AIPRISE_TEMPLATE_ID_KYB: Joi.string().uuid().required(),
  AIPRISE_URL: Joi.string().uri().required(),

  // AWS Bucket
  BUCKETACCESSKEYID: Joi.string().required(),
  BUCKETNAME: Joi.string().required(),
  BUCKETREGION: Joi.string().required(),
  BUCKETSECRETACCESSKEY: Joi.string().required(),

  // App / DB
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('develop', 'production', 'test')
    .default('develop'),
  POSTGRES_DB_URL: Joi.string().uri().required(),

  // JWT
  JWT_SECRET_KEY: Joi.string().required(),

  // Email service
  EMAIL_SERVICE: Joi.string().uri().required(),

  // Stellar keys
  COLLECTING_WALLET: Joi.string().required(),
  COLLECTING_SECRET: Joi.string().required(),
  USDC_ISSUER_ADDRESS_TESTNET: Joi.string().required(),
  USDC_ISSUER_ADDRESS_MAINNET: Joi.string().required(),
  XLM_WALLET_SECRET: Joi.string().required(),
});
