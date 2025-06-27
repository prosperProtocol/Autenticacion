import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AwsService {
public className = this.constructor.name;
  private readonly logger = new Logger(this.className);
  private readonly s3Client: S3Client;

  protected readonly bucketAccessKeyId: string;
  protected readonly bucketSecretAccessKey: string;
  protected readonly bucketRegion: string;
  protected readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const awsConfig = this.configService.get('config.aws');
    this.bucketAccessKeyId = awsConfig.accessKeyId;
    this.bucketSecretAccessKey = awsConfig.secretAccessKey;
    this.bucketRegion = awsConfig.region;
    this.bucketName = awsConfig.bucket;

    this.s3Client = new S3Client({
      region: this.bucketRegion,
      credentials: {
        accessKeyId: this.bucketAccessKeyId,
        secretAccessKey: this.bucketSecretAccessKey,
      },
    });
  }

  async uploadFile(file: Express.Multer.File, path: string, ext: string) {
    if (!this.bucketName) {
      throw new Error('El nombre del bucket no está configurado.');
    }

    const filename = `${uuidv4()}.${ext}`;
    const key = `${path}/${filename}`;

    try {
      const uploadResult = await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      return {
        filename,
        ServerSideEncryption: uploadResult.ServerSideEncryption,
        ETag: uploadResult.ETag,
        Location: `https://${this.bucketName}.s3.amazonaws.com/${key}`,
      };
    } catch (e) {
      this.logger.error(`Error en uploadFile: ${e.message}`, e.stack);
      return null;
    }
  }

  async listFiles(): Promise<string[]> {
    const params = { Bucket: this.bucketName };
    const data = await this.s3Client.send(new ListObjectsV2Command(params));
    return data.Contents?.map((item) => item.Key) || [];
  }

  async deleteFile(key: string): Promise<void> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
    };

    await this.s3Client.send(new DeleteObjectCommand(params));
  }
}
