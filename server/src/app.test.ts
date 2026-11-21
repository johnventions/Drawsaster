import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { io as connect, type Socket } from 'socket.io-client';
import type {
	ChatMessage,
	ClientToServerEvents,
	GameSnapshot,
	GameSummary,
	ServerToClientEvents,
	Session
} from '../../shared/protocol.ts';
import { createApp } from './app.ts';
import { GameStore } from './game/GameStore.ts';
import { LocalStore } from './storage/LocalStore.ts';

const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
	'base64'
);

let baseUrl = '';
let dir = '';
let close: () => Promise<void>;
const sockets: Socket[] = [];

before(async () => {
	dir = await mkdtemp(path.join(tmpdir(), 'drawsaster-'));
	const { server, io } = createApp({
		games: new GameStore({ minPlayers: 3, idleGameMs: 60_000, finishedGameMs: 60_000 }),
		store: new LocalStore(dir, 'test')
	});
	await new Promise<void>(resolve => server.listen(0, resolve));
	baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
	close = async () => {
		sockets.forEach(s => s.disconnect());
		await io.close();
	};
});

after(async () => {
	await close();
	await rm(dir, { recursive: true, force: true });
});

class Client {
	socket: Socket<ServerToClientEvents, ClientToServerEvents>;
	state: GameSnapshot | null = null;
	chats: ChatMessage[] = [];
	session: Session | null = null;
	private waiters: (() => void)[] = [];

	constructor() {
		this.socket = connect(baseUrl, { transports: ['websocket'], forceNew: true });
		sockets.push(this.socket);
		this.socket.on('game:state', s => {
			this.state = s;
			this.waiters.splice(0).forEach(w => w());
		});
		this.socket.on('chat:message', m => this.chats.push(m));
	}

	async until(check: (s: GameSnapshot) => boolean): Promise<GameSnapshot> {
		const deadline = Date.now() + 3000;
		while (!this.state || !check(this.state)) {
			if (Date.now() > deadline) throw new Error('Timed out waiting for state');
			await new Promise<void>(resolve => {
				this.waiters.push(resolve);
				setTimeout(resolve, 100);
			});
		}
		return this.state;
	}

	async put(chain: number, step: number, body: Buffer | { text: string }, token = this.session!.token) {
		const isImage = Buffer.isBuffer(body);
		return fetch(`${baseUrl}/api/games/${this.session!.code}/chains/${chain}/steps/${step}`, {
			method: 'PUT',
			headers: {
				authorization: `Bearer ${token}`,
				'content-type': isImage ? 'image/png' : 'application/json'
			},
			body: isImage ? new Uint8Array(body) : JSON.stringify(body)
		});
	}
}

test('a full game over sockets and HTTP', async () => {
	const [alice, bob, cara] = [new Client(), new Client(), new Client()];

	const created = await alice.socket.emitWithAck('game:create', { name: 'Alice' });
	assert.ok(created.ok);
	alice.session = created.session;
	const code = created.session.code;

	for (const [client, name] of [[bob, 'Bob'], [cara, 'Cara']] as const) {
		const res = await client.socket.emitWithAck('game:join', { code: code.toLowerCase(), name });
		assert.ok(res.ok, JSON.stringify(res));
		client.session = res.session;
	}
	const dup = await new Client().socket.emitWithAck('game:join', { code, name: 'ALICE' });
	assert.deepEqual(dup, { ok: false, error: 'That name is already taken in this game' });

	await alice.until(s => s.players.length === 3);
	assert.deepEqual((await bob.socket.emitWithAck('game:start')), { ok: false, error: 'Only the host can do that' });
	assert.ok((await alice.socket.emitWithAck('game:start')).ok);

	const clients = [alice, bob, cara];
	for (const c of clients) await c.until(s => s.phase === 'playing' && s.tasks.length === 1);

	// wrong player and missing token are rejected
	const aliceTask = alice.state!.tasks[0]!;
	assert.equal((await bob.put(aliceTask.chain, aliceTask.step, { text: 'x' })).status, 403);
	assert.equal((await alice.put(aliceTask.chain, aliceTask.step, { text: 'x' }, 'nope')).status, 401);

	let caption: string | null = null;
	while (alice.state!.phase !== 'done') {
		let played = false;
		for (const c of clients) {
			const task = c.state!.tasks[0];
			if (!task) continue;
			const body = task.type === 'drawing' ? PNG : { text: `${c.state!.you.name} ${task.chain}-${task.step}` };
			if (task.type === 'caption') caption = task.promptImage;
			const done = c.state!.progress.done + 1;
			const res = await c.put(task.chain, task.step, body);
			assert.equal(res.status, 200, await res.text());
			// retrying is harmless
			assert.equal((await c.put(task.chain, task.step, body)).status, 200);
			for (const other of clients) await other.until(s => s.progress.done >= done);
			played = true;
		}
		assert.ok(played, 'someone should always have a task');
	}

	// drawings are stored and served
	assert.ok(caption);
	const image = await fetch(baseUrl + caption);
	assert.equal(image.status, 200);
	assert.deepEqual(Buffer.from(await image.arrayBuffer()), PNG);

	// the summary is available and persisted
	const summary = await (await fetch(`${baseUrl}/api/games/${alice.state!.gameId}/summary`)).json() as GameSummary;
	assert.equal(summary.chains.length, 3);
	assert.ok(summary.chains.every(c => c.steps.length === 3));
	const saved = await new LocalStore(dir, 'test').get(`games/${summary.gameId}/summary.json`);
	assert.ok(saved, 'summary JSON should be stored under the env prefix');
});

test('reconnecting, skipping an absent player, and chat relay', async () => {
	const [host, b, c] = [new Client(), new Client(), new Client()];
	host.session = (await host.socket.emitWithAck('game:create', { name: 'Host' }) as { session: Session }).session;
	const code = host.session.code;
	b.session = (await b.socket.emitWithAck('game:join', { code, name: 'B' }) as { session: Session }).session;
	c.session = (await c.socket.emitWithAck('game:join', { code, name: 'C' }) as { session: Session }).session;
	await host.until(s => s.players.length === 3);
	await host.socket.emitWithAck('game:start');

	// C drops: everyone sees it
	c.socket.disconnect();
	await host.until(s => s.players.find(p => p.name === 'C')!.connected === false);

	// C comes back on a new connection with the saved session
	const c2 = new Client();
	assert.ok((await c2.socket.emitWithAck('session:resume', c.session)).ok);
	await c2.until(s => s.phase === 'playing' && s.tasks.length === 1);
	await host.until(s => s.players.find(p => p.name === 'C')!.connected);
	const bad = await new Client().socket.emitWithAck('session:resume', { ...c.session, token: 'wrong' });
	assert.equal(bad.ok, false);

	// a second tab for the same player gets state too, and closing it doesn't mark them away
	const cTab = new Client();
	assert.ok((await cTab.socket.emitWithAck('session:resume', c.session)).ok);
	await cTab.until(s => s.you.name === 'C');
	cTab.socket.disconnect();
	await new Promise(resolve => setTimeout(resolve, 100));
	assert.equal(host.state!.players.find(p => p.name === 'C')!.connected, true);

	// host skips C's step; the waiting count drops
	const cId = c2.state!.you.id;
	assert.equal(host.state!.players.find(p => p.id === cId)!.waiting, 1);
	assert.ok((await host.socket.emitWithAck('host:skip', { playerId: cId })).ok);
	await host.until(s => s.players.find(p => p.id === cId)!.waiting === 0);
	assert.equal((await b.socket.emitWithAck('host:skip', { playerId: cId })).ok, false);

	// leaving: every tab of that player is told, the others see them as left, and the token stops working
	const cOtherTab = new Client();
	assert.ok((await cOtherTab.socket.emitWithAck('session:resume', c.session)).ok);
	let ended = false;
	cOtherTab.socket.on('session:ended', () => { ended = true; });
	assert.ok((await c2.socket.emitWithAck('game:leave')).ok);
	await host.until(s => s.players.find(p => p.id === cId)!.left);
	assert.equal(host.state!.players.find(p => p.id === cId)!.connected, false);
	await new Promise(resolve => setTimeout(resolve, 100));
	assert.ok(ended, 'the other tab is told the session ended');
	assert.equal((await new Client().socket.emitWithAck('session:resume', c.session)).ok, false);
	assert.equal((await c2.socket.emitWithAck('game:start')).ok, false, 'a socket that left is not in a game');

	// chat is relayed to everyone in the game and not stored
	const image = 'data:image/png;base64,' + PNG.toString('base64');
	assert.ok((await b.socket.emitWithAck('chat:send', { image })).ok);
	await host.until(() => host.chats.length === 1);
	assert.equal(host.chats[0]!.name, 'B');
	assert.equal((await b.socket.emitWithAck('chat:send', { image: 'data:text/plain;base64,aGk=' })).ok, false);
});
