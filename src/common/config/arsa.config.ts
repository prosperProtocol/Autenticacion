import { registerAs } from '@nestjs/config';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

export default registerAs('arsa', () => {
  // Read directly from .env to avoid issues with xargs corrupting process.env
  let envConfig: Record<string, string> = {};
  try {
    envConfig = dotenv.parse(fs.readFileSync('.env'));
  } catch (e) {
    console.error('Error reading .env file:', e);
  }

  return {
    api_url: envConfig.ARSA_API_URL || process.env.ARSA_API_URL || 'https://api.andeslabs.io/mint/v1/',
    api_key: envConfig.ARSA_API_KEY || process.env.ARSA_API_KEY,
    api_private_key: (envConfig.ARSA_PRIVATE_KEY || process.env.ARSA_PRIVATE_KEY)?.replace(/\\n/g, '\n'),
  };
});
