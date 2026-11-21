function int(name: string, fallback: number): number {
	const value = process.env[name];
	return value ? Number.parseInt(value, 10) : fallback;
}

const imageStore = process.env.IMAGE_STORE ?? 'local';
if (imageStore !== 'local' && imageStore !== 's3') {
	throw new Error(`IMAGE_STORE must be "local" or "s3", got "${imageStore}"`);
}

const appEnv = process.env.APP_ENV ?? 'dev';
if (!/^[a-z0-9-]+$/.test(appEnv)) {
	throw new Error('APP_ENV may only contain lowercase letters, digits and dashes');
}

/** `--port=5050` on the command line wins over PORT, so dev tooling that sets PORT can't move the API. */
const portArg = process.argv.find(a => a.startsWith('--port='))?.slice('--port='.length);

export const config = {
	/** Namespaces every stored object: <APP_ENV>/games/... */
	appEnv,
	port: portArg ? Number.parseInt(portArg, 10) : int('PORT', 5050),
	minPlayers: int('MIN_PLAYERS', 3),
	imageStore,
	localStorageDir: process.env.LOCAL_STORAGE_DIR ?? 'storage',
	s3Bucket: process.env.S3_BUCKET ?? '',
	awsRegion: process.env.AWS_REGION ?? 'us-east-1',
	/** Optional S3-compatible endpoint (MinIO, LocalStack) for local testing. */
	s3Endpoint: process.env.S3_ENDPOINT || undefined,
	/** Games in the lobby or in progress are dropped after this long without activity. */
	idleGameMs: int('IDLE_GAME_MINUTES', 6 * 60) * 60_000,
	/** Finished games stay in memory this long; their summary lives on in storage. */
	finishedGameMs: int('FINISHED_GAME_MINUTES', 60) * 60_000
} as const;

if (config.imageStore === 's3' && !config.s3Bucket) {
	throw new Error('S3_BUCKET is required when IMAGE_STORE=s3');
}
