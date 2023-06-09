const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const webpack = require('webpack');

const production = (process.env.NODE_ENV === 'production');

module.exports = {
	mode: production ? 'production' : 'development',
	entry: {
		main: './src/main.ts',
	},
	output: {
		filename: '[name].bundle.js',
		path: path.resolve(__dirname, 'build'),
	},
	devtool: 'source-map',
	devServer: {
		// Hot reload with WebGL/GPU causes leaky memory
		hot: false,
		host: '0.0.0.0',
		port: 8088,
		historyApiFallback: true,
		static: {
			directory: path.join(__dirname, 'static'),
		},
	},
	module: {
		rules: [
			// Typescript
			{ test: /\.ts$/, loader: 'ts-loader', options: { configFile: 'tsconfig.json' }, exclude: /node_modules/ },

			// Static files
			{ test: /\.(glsl|html|css)$/, use: ['raw-loader'] },

			// WGSL Shader files
			{
				test: /\.(wgsl)$/,
				use: [
					{ loader: path.resolve('src/wgsl-loader.js') },
				]
			},
		],
	},
	resolve: {
		extensions: ['.ts', '.js'],
		plugins: [
			new TsconfigPathsPlugin({
				configFile: 'tsconfig.json',
			}),
		],
	},
	plugins: [
		new webpack.DefinePlugin({
			'PRODUCTION': JSON.stringify(production),
		}),
	],
}
