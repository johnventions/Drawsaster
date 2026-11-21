/**
 * Where drawings and finished-game summaries live. Keys are relative
 * ("games/<gameId>/0-1.png"); each store puts them under the APP_ENV prefix.
 */
export interface ObjectStore {
	put(key: string, body: Buffer, contentType: string): Promise<void>;
	get(key: string): Promise<Buffer | null>;
	/** A URL to redirect the browser to, or null if the server should send the bytes itself. */
	readUrl(key: string): Promise<string | null>;
}

/** Only allow keys we generate ourselves: games/<uuid>/<name>.<ext> */
export function isValidKey(key: string): boolean {
	return /^games\/[0-9a-f-]{36}\/[a-z0-9-]+\.(png|json)$/.test(key);
}

export const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function isPng(body: Buffer): boolean {
	return body.length > PNG_SIGNATURE.length && body.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}
