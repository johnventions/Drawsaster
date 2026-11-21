<template>
	<div :style="{ width, height }">
		<canvas ref="canvas" :style="{ width: '100%', height: '100%' }"></canvas>
	</div>
</template>

<script>
import { markRaw } from 'vue';
import SignaturePad from 'signature_pad';

// Canvas drawing pad built on signature_pad 5.
// signature_pad saves each stroke's pen color and brush sizes, so undo and
// resize redraw every stroke the way it was drawn.
export default {
	name: 'DrawPad',
	props: {
		width: { type: String, default: '100%' },
		height: { type: String, default: '100%' },
		options: { type: Object, default: () => ({}) }
	},
	mounted() {
		// Not reactive on purpose: Vue proxies would slow down drawing.
		this.signaturePad = markRaw(new SignaturePad(this.$refs.canvas, { ...this.options }));
		this.onResize = () => this.resizeCanvas();
		window.addEventListener('resize', this.onResize);
		this.resizeCanvas();
	},
	beforeUnmount() {
		window.removeEventListener('resize', this.onResize);
		this.signaturePad.off();
	},
	methods: {
		resizeCanvas() {
			const canvas = this.$refs.canvas;
			const data = this.signaturePad.toData();
			const ratio = Math.max(window.devicePixelRatio || 1, 1);
			canvas.width = canvas.offsetWidth * ratio;
			canvas.height = canvas.offsetHeight * ratio;
			canvas.getContext('2d').scale(ratio, ratio);
			this.signaturePad.fromData(data);
		},
		undo() {
			const data = this.signaturePad.toData();
			if (data.length > 0) {
				this.signaturePad.fromData(data.slice(0, -1));
			}
		},
		isEmpty() {
			return this.signaturePad.isEmpty();
		},
		toDataURL(type = 'image/png') {
			return this.signaturePad.toDataURL(type);
		}
	}
};
</script>
