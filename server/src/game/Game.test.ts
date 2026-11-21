import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, GameError } from './Game.ts';

function setup(count: number) {
	const game = new Game({ code: 'TEST', minPlayers: 3, random: () => 0.5 });
	const players = Array.from({ length: count }, (_, i) => game.addPlayer(`Player ${i + 1}`));
	game.start(players[0]!.id);
	return { game, players };
}

/** Play every ready task until nothing is left, picking players in the given order. */
function playAll(game: Game, order: string[]) {
	let progressed = true;
	while (progressed) {
		progressed = false;
		for (const id of order) {
			const task = game.tasksFor(id)[0];
			if (!task) continue;
			const content = task.type === 'drawing'
				? { imageKey: `img-${task.chain}-${task.step}` }
				: { text: `text ${task.chain}-${task.step} by ${id}` };
			assert.equal(game.submit(id, task.chain, task.step, content), 'saved');
			progressed = true;
		}
	}
}

test('every chain visits every player exactly once, alternating types', () => {
	for (const count of [3, 4, 5, 6]) {
		const { game, players } = setup(count);
		playAll(game, players.map(p => p.id));
		assert.equal(game.phase, 'done', `${count} players should finish`);
		for (const chain of game.chains) {
			assert.equal(chain.steps.length, count);
			assert.equal(new Set(chain.steps.map(s => s.authorId)).size, count);
			assert.equal(chain.steps[0]!.authorId, chain.ownerId);
			assert.deepEqual(
				chain.steps.map(s => s.type),
				chain.steps.map((_, i) => (i === 0 ? 'start' : i % 2 ? 'drawing' : 'caption'))
			);
		}
		for (const p of players) assert.equal(p.completed, count);
	}
});

test('order of play does not matter', () => {
	const { game, players } = setup(5);
	playAll(game, players.map(p => p.id).reverse());
	assert.equal(game.phase, 'done');
});

test('each player starts with exactly one task: their own chain', () => {
	const { game, players } = setup(4);
	for (const p of players) {
		const tasks = game.tasksFor(p.id);
		assert.equal(tasks.length, 1);
		assert.equal(tasks[0]!.type, 'start');
		assert.equal(game.chains[tasks[0]!.chain]!.ownerId, p.id);
	}
});

test('tasks queue up when a player is slow', () => {
	const { game, players } = setup(4);
	const slow = players[0]!.id;
	// everyone else plays as much as they can
	playAll(game, players.slice(1).map(p => p.id));
	const waiting = game.tasksFor(slow);
	assert.ok(waiting.length >= 2, 'slow player should have a queue');
	const view = game.snapshotFor(players[1]!.id).players.find(p => p.id === slow)!;
	assert.equal(view.waiting, waiting.length);
	// tasks are oldest first
	assert.deepEqual(waiting.map(t => t.step), [...waiting.map(t => t.step)].sort((a, b) => a - b));
});

test('prompts carry the previous step content', () => {
	const { game, players } = setup(3);
	const [a] = players;
	const start = game.tasksFor(a!.id)[0]!;
	game.submit(a!.id, start.chain, 0, { text: 'Humpty Dumpty at the beach' });
	const drawer = game.seats[(start.chain + 1) % 3]!;
	const drawTask = game.tasksFor(drawer).find(t => t.chain === start.chain)!;
	assert.equal(drawTask.type, 'drawing');
	assert.equal(drawTask.promptText, 'Humpty Dumpty at the beach');
	game.submit(drawer, start.chain, 1, { imageKey: 'dev/x.png' });
	const captioner = game.seats[(start.chain + 2) % 3]!;
	const captionTask = game.tasksFor(captioner).find(t => t.chain === start.chain)!;
	assert.equal(captionTask.type, 'caption');
	assert.equal(captionTask.promptImage, '/api/images/dev/x.png');
});

test('retrying a submit is harmless', () => {
	const { game, players } = setup(3);
	const id = players[0]!.id;
	const task = game.tasksFor(id)[0]!;
	assert.equal(game.submit(id, task.chain, task.step, { text: 'hello' }), 'saved');
	assert.equal(game.submit(id, task.chain, task.step, { text: 'hello' }), 'duplicate');
	assert.equal(game.chains[task.chain]!.steps.length, 1);
	assert.equal(players[0]!.completed, 1);
});

test('rejects steps that are not yours, not ready, or the wrong content', () => {
	const { game, players } = setup(3);
	const [a, b] = players.map(p => p.id);
	const task = game.tasksFor(a!)[0]!;
	assert.throws(() => game.submit(b!, task.chain, 0, { text: 'x' }), (e: GameError) => e.status === 403);
	const drawer = game.seats[(task.chain + 1) % 3]!;
	assert.throws(() => game.submit(drawer, task.chain, 1, { imageKey: 'k' }), (e: GameError) => e.status === 409);
	assert.throws(() => game.submit(a!, task.chain, 0, { imageKey: 'k' }), /needs text/);
	assert.throws(() => game.submit(a!, task.chain, 0, { text: '   ' }), /empty/);
	game.submit(a!, task.chain, 0, { text: 'ok' });
	assert.throws(() => game.submit(drawer, task.chain, 1, { text: 'nope' }), /needs a drawing/);
	assert.throws(() => game.submit(a!, 99, 0, { text: 'x' }), (e: GameError) => e.status === 404);
});

test('host can skip an absent player and the chain continues from the last real step', () => {
	const { game, players } = setup(3);
	const [host, , away] = players.map(p => p.id);
	assert.throws(() => game.skip(away!, host!), (e: GameError) => e.status === 403);

	// the absent player's own start step is skipped: the next player writes a phrase instead
	const awayStart = game.tasksFor(away!)[0]!;
	game.skip(host!, away!);
	const next = game.seats[(awayStart.chain + 1) % 3]!;
	const replacement = game.tasksFor(next).find(t => t.chain === awayStart.chain)!;
	assert.equal(replacement.type, 'start');

	// a skipped drawing step: the next player draws the same phrase
	const awaySeat = game.players.get(away!)!.seat!;
	const chain = (awaySeat + 2) % 3; // the chain whose step 1 belongs to `away`
	const owner = game.seats[chain]!;
	game.submit(owner, chain, 0, { text: 'a cat' });
	assert.equal(game.tasksFor(away!)[0]!.type, 'drawing');
	game.skip(host!, away!);
	const after = game.seats[(chain + 2) % 3]!;
	const task = game.tasksFor(after).find(t => t.chain === chain)!;
	assert.equal(task.type, 'drawing');
	assert.equal(task.promptText, 'a cat');

	// skipped steps can't be submitted afterwards
	assert.throws(() => game.submit(away!, awayStart.chain, 0, { text: 'late' }), /skipped/);
});

test('a game where one player is always skipped still finishes', () => {
	const { game, players } = setup(4);
	const [host, , , away] = players.map(p => p.id);
	let guard = 100;
	while (game.phase === 'playing' && guard-- > 0) {
		playAll(game, players.map(p => p.id).filter(id => id !== away));
		if (game.tasksFor(away!).length) game.skip(host!, away!);
	}
	assert.equal(game.phase, 'done');
	assert.equal(game.players.get(away!)!.completed, 0);
});

test('lobby rules: unique names, min players, host-only start, no late joins', () => {
	const game = new Game({ code: 'TEST', minPlayers: 3 });
	const host = game.addPlayer('  Alice  ');
	assert.equal(host.name, 'Alice');
	assert.throws(() => game.addPlayer('alice'), /taken/);
	assert.throws(() => game.addPlayer('   '), /name/);
	const bob = game.addPlayer('Bob');
	assert.throws(() => game.start(host.id), /At least 3/);
	game.addPlayer('Cara');
	assert.throws(() => game.start(bob.id), (e: GameError) => e.status === 403);
	game.start(host.id);
	assert.throws(() => game.addPlayer('Dan'), /already started/);
});

test('snapshot hides other players tokens and reports progress', () => {
	const { game, players } = setup(3);
	const snap = game.snapshotFor(players[1]!.id);
	assert.equal(snap.you.isHost, false);
	assert.equal(snap.players.length, 3);
	assert.ok(!JSON.stringify(snap).includes(players[0]!.token));
	assert.deepEqual(snap.progress, { done: 0, total: 9 });
});
