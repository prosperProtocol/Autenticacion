import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  return {
    database_url: process.env.POSTGRES_DB_URL,
    server_secret: process.env.JWT_SECRET_KEY,
    server_port: parseInt(process.env.PORT, 10) || 4000,
    server_node_env: process.env.NODE_ENV || 'develop',
    jwt_expires_in: parseInt(process.env.JWT_EXPIRES_IN, 10) || 10800,
    secret: process.env.SECRET_KEY ?? 'default_secret_key',
  };
});
