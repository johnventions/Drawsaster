import { test } from 'node:test';
import assert from 'node:assert/strict';
import { S3Store } from './S3Store.ts';

// Runs only against a real or S3-compatible bucket, e.g. MinIO:
//   S3_TEST_ENDPOINT=http://localhost:9000 S3_TEST_BUCKET=drawsaster AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... npm test
const endpoint = process.env.S3_TEST_ENDPOINT;
const bucket = process.env.S3_TEST_BUCKET;

test('S3Store round trip under the env prefix', { skip: !bucket && 'set S3_TEST_BUCKET to run' }, async () => {
	const store = new S3Store({ bucket: bucket!, region: process.env.AWS_REGION ?? 'us-east-1', appEnv: 'test', endpoint });
	const key = 'games/00000000-0000-0000-0000-000000000000/0-1.png';
	const body = Buffer.from('fake png bytes');
	await store.put(key, body, 'image/png');
	assert.deepEqual(await store.get(key), body);
	assert.equal(await store.get('games/00000000-0000-0000-0000-000000000000/missing.png'), null);

	const url = await store.readUrl(key);
	assert.ok(url && url.includes('/test/games/'), 'signed URL should include the env prefix');
	const res = await fetch(url);
	assert.equal(res.status, 200);
	assert.deepEqual(Buffer.from(await res.arrayBuffer()), body);
});
