import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getRequiredEnv } from './utils';
import { randomUUID } from 'crypto';

@Injectable()
export class S3Service {
    private readonly client: S3Client;
    private readonly bucket: string;

    constructor(private readonly config: ConfigService) {
        this.bucket = getRequiredEnv(this.config, 'AWS_S3_BUCKET');
        this.client = new S3Client({
            region: getRequiredEnv(this.config, 'AWS_REGION'),
            credentials: {
                accessKeyId: getRequiredEnv(
                    this.config,
                    'AWS_S3_ACCESS_KEY_ID',
                ),
                secretAccessKey: getRequiredEnv(
                    this.config,
                    'AWS_S3_SECRET_ACCESS_KEY',
                ),
            },
        });
    }

    async upload(
        buffer: Buffer,
        key: string,
        contentType: string,
    ): Promise<string> {
        try {
            const uniqueSuffix = randomUUID();
            const keyWithSuffix = `${key}/${uniqueSuffix}`;

            await this.client.send(
                new PutObjectCommand({
                    Bucket: this.bucket,
                    Key: keyWithSuffix,
                    Body: buffer,
                    ContentType: contentType,
                    ACL: 'public-read',
                }),
            );
            return `https://s3.${this.config.get('AWS_REGION')}.amazonaws.com/${this.bucket}/${keyWithSuffix}`;
        } catch (err) {
            throw new InternalServerErrorException('S3 업로드 실패', err);
        }
    }
}
