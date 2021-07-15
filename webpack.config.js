const path = require('path')

module.exports = {
	entry: "./src/index.ts",
	resolve: {
		extensions: [".ts", ".js"]
	},
	output: {
		filename: "bundle.js",
		path: path.resolve(__dirname, "dist")
	},
	module: {
		rules: [
			{
				use: "ts-loader",
				exclude: /node_modules/
			}
		]
	},
	devtool: "source-map"
}