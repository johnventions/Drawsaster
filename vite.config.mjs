import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const api = 'http://localhost:5050';

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url))
		}
	},
	css: {
		preprocessorOptions: {
			scss: {
				// make variables and breakpoints available in every component
				additionalData: `@use "@/styles/imports" as *;\n`
			}
		}
	},
	server: {
		port: 8080,
		proxy: {
			'/api': api,
			'/socket.io': { target: api, ws: true }
		}
	}
});
