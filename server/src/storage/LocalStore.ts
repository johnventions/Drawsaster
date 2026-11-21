import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ObjectStore } from './ObjectStore.ts';

/** Stores objects on disk under <dir>/<appEnv>/. For development without AWS. */
export class LocalStore implements ObjectStore {
	private readonly root: string;

	constructor(dir: string, appEnv: string) {
		this.root = path.resolve(dir, appEnv);
	}

	filePath(key: string): string {
		const file = path.resolve(this.root, key);
		if (!file.startsWith(this.root + path.sep)) throw new Error('Invalid key');
		return file;
	}

	async put(key: string, body: Buffer): Promise<void> {
		const file = this.filePath(key);
		await mkdir(path.dirname(file), { recursive: true });
		await writeFile(file, body);
	}

	async get(key: string): Promise<Buffer | null> {
		try {
			return await readFile(this.filePath(key));
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
			throw err;
		}
	}

	async readUrl(): Promise<null> {
		return null;
	}
}
