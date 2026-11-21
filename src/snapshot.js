// Renders a snapshot image of consecutive story steps on a canvas, in the
// browser. Portrait layout: steps stacked top to bottom.

/** @typedef {import('../shared/protocol').SummaryStep} SummaryStep */

const WIDTH = 1080;
const PAD = 64;
const GAP = 40;
const INNER = WIDTH - PAD * 2;

const STYLES = {
	purple: {
		background: ctx => {
			const g = ctx.createLinearGradient(0, 0, WIDTH * 0.35, ctx.canvas.height);
			g.addColorStop(0, '#3224af');
			g.addColorStop(1, '#b149c4');
			return g;
		},
		bubble: '#2d2828',
		bubbleText: '#ffffff',
		label: 'rgba(255, 255, 255, 0.8)',
		footer: '#ffffff',
		imageBorder: null
	},
	white: {
		background: () => '#ffffff',
		bubble: '#eeedfe',
		bubbleText: '#26215c',
		label: '#534ab7',
		footer: '#534ab7',
		imageBorder: '#d3d1c7'
	}
};

const TEXT_FONT = '48px Cabin, sans-serif';
const LINE_HEIGHT = 62;
const LABEL_FONT = '32px Cabin, sans-serif';
const FOOTER_FONT = '700 56px "Amatic SC", sans-serif';

let fontsReady;
function loadFonts() {
	fontsReady ??= Promise.all([
		document.fonts.load(TEXT_FONT),
		document.fonts.load(LABEL_FONT),
		document.fonts.load(FOOTER_FONT)
	]).catch(() => {});
	return fontsReady;
}

const imageCache = new Map();
/** Load a drawing from this origin so the canvas stays exportable. */
function loadImage(url) {
	if (!imageCache.has(url)) {
		const sep = url.includes('?') ? '&' : '?';
		imageCache.set(url, fetch(url + sep + 'inline=1')
			.then(res => {
				if (!res.ok) throw new Error('Could not load a drawing');
				return res.blob();
			})
			.then(blob => createImageBitmap(blob)));
	}
	return imageCache.get(url);
}

function wrapText(ctx, text, maxWidth) {
	const words = text.split(/\s+/);
	const lines = [];
	let line = '';
	for (const word of words) {
		const next = line ? line + ' ' + word : word;
		if (ctx.measureText(next).width > maxWidth && line) {
			lines.push(line);
			line = word;
		} else {
			line = next;
		}
	}
	if (line) lines.push(line);
	return lines;
}

function roundRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, r);
}

/**
 * @param {object} args
 * @param {SummaryStep[]} args.steps  the steps to include, in order (no skipped steps)
 * @param {(id: string) => string} args.authorName
 * @param {{ style: 'purple' | 'white', names: boolean, footer: boolean }} args.options
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderSnapshot({ steps, authorName, options }) {
	await loadFonts();
	const style = STYLES[options.style] ?? STYLES.purple;
	const measure = document.createElement('canvas').getContext('2d');

	// lay out every block first, so the canvas can be sized exactly
	const blocks = [];
	for (const step of steps) {
		const block = { step, label: options.names ? authorName(step.authorId) : null };
		if (step.image) {
			block.bitmap = await loadImage(step.image);
			block.height = Math.round(INNER * (block.bitmap.height / block.bitmap.width));
		} else {
			measure.font = TEXT_FONT;
			block.lines = wrapText(measure, step.text ?? '', INNER - 80);
			block.height = block.lines.length * LINE_HEIGHT + 56;
		}
		block.total = block.height + (block.label ? 48 : 0);
		blocks.push(block);
	}
	const footerHeight = options.footer ? 90 : 0;
	const height = PAD * 2 + blocks.reduce((sum, b) => sum + b.total, 0) + GAP * (blocks.length - 1) + footerHeight;

	const canvas = document.createElement('canvas');
	canvas.width = WIDTH;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = style.background(ctx);
	ctx.fillRect(0, 0, WIDTH, height);

	let y = PAD;
	for (const block of blocks) {
		if (block.label) {
			ctx.font = LABEL_FONT;
			ctx.fillStyle = style.label;
			ctx.textBaseline = 'top';
			ctx.fillText(block.label, PAD, y);
			y += 48;
		}
		if (block.bitmap) {
			ctx.save();
			roundRect(ctx, PAD, y, INNER, block.height, 24);
			ctx.clip();
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(PAD, y, INNER, block.height);
			ctx.drawImage(block.bitmap, PAD, y, INNER, block.height);
			ctx.restore();
			if (style.imageBorder) {
				ctx.strokeStyle = style.imageBorder;
				ctx.lineWidth = 2;
				roundRect(ctx, PAD, y, INNER, block.height, 24);
				ctx.stroke();
			}
		} else {
			ctx.fillStyle = style.bubble;
			roundRect(ctx, PAD, y, INNER, block.height, 24);
			ctx.fill();
			ctx.font = TEXT_FONT;
			ctx.fillStyle = style.bubbleText;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'top';
			block.lines.forEach((line, i) => ctx.fillText(line, WIDTH / 2, y + 28 + i * LINE_HEIGHT));
			ctx.textAlign = 'left';
		}
		y += block.height + GAP;
	}

	if (options.footer) {
		ctx.font = FOOTER_FONT;
		ctx.fillStyle = style.footer;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'bottom';
		ctx.fillText('drawsaster.com', WIDTH / 2, height - PAD + 30);
	}
	return canvas;
}

export function canvasToBlob(canvas) {
	return new Promise((resolve, reject) => {
		canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not create the image'))), 'image/png');
	});
}

export function snapshotFileName(code, steps) {
	const firstText = steps.find(s => s.text)?.text ?? 'snapshot';
	const slug = firstText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'snapshot';
	return `drawsaster-${code}-${slug}.png`;
}
