import { config } from '../config.ts';
import { LocalStore } from './LocalStore.ts';
import type { ObjectStore } from './ObjectStore.ts';
import { S3Store } from './S3Store.ts';

export function createObjectStore(): ObjectStore {
	if (config.imageStore === 's3') {
		return new S3Store({ bucket: config.s3Bucket, region: config.awsRegion, appEnv: config.appEnv, endpoint: config.s3Endpoint });
	}
	return new LocalStore(config.localStorageDir, config.appEnv);
}
