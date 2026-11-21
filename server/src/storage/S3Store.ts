import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ObjectStore } from './ObjectStore.ts';

/** Stores objects in a private S3 bucket under <appEnv>/. Reads use short-lived signed URLs. */
export class S3Store implements ObjectStore {
	private readonly client: S3Client;
	private readonly bucket: string;
	private readonly prefix: string;

	constructor(options: { bucket: string; region: string; appEnv: string; endpoint?: string }) {
		this.client = new S3Client({
			region: options.region,
			...(options.endpoint ? { endpoint: options.endpoint, forcePathStyle: true } : {})
		});
		this.bucket = options.bucket;
		this.prefix = options.appEnv + '/';
	}

	async put(key: string, body: Buffer, contentType: string): Promise<void> {
		await this.client.send(new PutObjectCommand({
			Bucket: this.bucket,
			Key: this.prefix + key,
			Body: body,
			ContentType: contentType,
			CacheControl: 'private, max-age=86400, immutable'
		}));
	}

	async get(key: string): Promise<Buffer | null> {
		try {
			const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.prefix + key }));
			return res.Body ? Buffer.from(await res.Body.transformToByteArray()) : null;
		} catch (err) {
			if (err instanceof NoSuchKey) return null;
			throw err;
		}
	}

	async readUrl(key: string): Promise<string> {
		return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: this.prefix + key }), {
			expiresIn: 3600
		});
	}
}
