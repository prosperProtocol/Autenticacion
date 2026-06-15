import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('config');
        return {
          type: 'postgres',
          url: dbConfig.database_url,
          // synchronize: true,
          synchronize: false,
          // logging: ['error', 'query'],
          logging: ['error'],
          autoLoadEntities: true,
        };
      },
    }),
  ],
})
export class DatabaseModule { }
