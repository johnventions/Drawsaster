const path = require("path");

module.exports = {
	pluginOptions: {
		'style-resources-loader': {
			preProcessor: 'stylus',
			patterns: ['\\src\\styles\\imports.styl']
		}
	},
	devServer: {
		proxy: 'http://localhost:5050/'
	}
}
