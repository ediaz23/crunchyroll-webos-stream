/* eslint no-console: off, no-undef: off */
/* eslint-env node, es6 */
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const clearConsole = require('react-dev-utils/clearConsole');
const evalSourceMapMiddleware = require('react-dev-utils/evalSourceMapMiddleware');
const getPublicUrlOrPath = require('react-dev-utils/getPublicUrlOrPath');
const openBrowser = require('react-dev-utils/openBrowser');
const redirectServedPathMiddleware = require('react-dev-utils/redirectServedPathMiddleware');
const ignoredFiles = require('react-dev-utils/ignoredFiles');
const {choosePort, createCompiler, prepareProxy, prepareUrls} = require('react-dev-utils/WebpackDevServerUtils');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const {optionParser: app} = require('@enact/dev-utils');

let chalk;

// Any unhandled promise rejections should be treated like errors.
process.on('unhandledRejection', err => {
	throw err;
});

// As react-dev-utils assumes the webpack production packaging command is
// "npm run build" with no way to modify it yet, we provide a basic override
// to console.log to ensure the correct output is displayed to the user.
// prettier-ignore
console.log = (log => (data, ...rest) => {
	if (typeof data === 'undefined') {
		return log();
	} else if (typeof data === 'string') {
		return log(data.replace(/npm run build/, 'npm run pack-p'), ...rest);
	}
	return log.call(this, data, ...rest);
})(console.log);

function displayHelp () {
	let e = 'node ' + path.relative(process.cwd(), __filename);
	if (require.main !== module) e = 'enact serve';

	console.log('  Usage');
	console.log(`    ${e} [options]`);
	console.log();
	console.log('  Options');
	console.log('    -b, --browser     Automatically open browser');
	console.log('    -i, --host        Server host IP address');
	console.log('    -f, --fast        Enables experimental frast refresh');
	console.log('    -p, --port        Server port number');
	console.log('    -m, --meta        JSON to override package.json enact metadata');
	console.log('    --no-linting      Build without code linting');
	console.log('    -v, --version     Display version information');
	console.log('    -h, --help        Display help information');
	console.log();
	process.exit(0);
}

function hotDevServer (config, fastRefresh) {
	// Keep webpack alive when there are any errors, so user can fix and rebuild.
	config.bail = false;
	// Ensure the CLI version of Chalk is used for webpackHotDevClient
	// since tslint includes an out-of-date local version.
	config.resolve.alias.chalk = require.resolve('chalk');
	config.resolve.alias['ansi-styles'] = require.resolve('ansi-styles');

	// Include an alternative client for WebpackDevServer. A client's job is to
	// connect to WebpackDevServer by a socket and get notified about changes.
	// When you save a file, the client will either apply hot updates (in case
	// of CSS changes), or refresh the page (in case of JS changes). When you
	// make a syntax error, this client will display a syntax error overlay.
	// Note: instead of the default WebpackDevServer client, we use a custom one
	// to bring better experience.
	if (!fastRefresh) {
		config.entry.main.unshift(require.resolve('react-dev-utils/webpackHotDevClient'));
	} else {
		// Use experimental fast refresh plugin instead as dev client access point
		// https://github.com/facebook/react/tree/master/packages/react-refresh
		config.plugins.unshift(
			new ReactRefreshWebpackPlugin({
				overlay: false
			})
		);
		// Append fast refresh babel plugin
		config.module.rules[1].oneOf[0].options.plugins = [require.resolve('react-refresh/babel')];
	}
	return config;
}

function devServerConfig (host, port, protocol, publicPath, proxy, allowedHost) {
	let server = {
		type: 'http'
	};
	const {SSL_CRT_FILE, SSL_KEY_FILE} = process.env;
	if (protocol === 'https' && [SSL_CRT_FILE, SSL_KEY_FILE].every(f => f && fs.existsSync(f))) {
		server = {
			type: 'https',
			options: {
				cert: fs.readFileSync(SSL_CRT_FILE),
				key: fs.readFileSync(SSL_KEY_FILE)
			}
		};
	}
	const disableFirewall = !proxy || process.env.DANGEROUSLY_DISABLE_HOST_CHECK === 'true';

	return {
		// WebpackDevServer 2.4.3 introduced a security fix that prevents remote
		// websites from potentially accessing local content through DNS rebinding:
		// https://github.com/webpack/webpack-dev-server/issues/887
		// https://medium.com/webpack/webpack-dev-server-middleware-security-issues-1489d950874a
		// However, it made several existing use cases such as development in cloud
		// environment or subdomains in development significantly more complicated:
		// https://github.com/facebookincubator/create-react-app/issues/2271
		// https://github.com/facebookincubator/create-react-app/issues/2233
		// While we're investigating better solutions, for now we will take a
		// compromise. Since our WDS configuration only serves files in the `public`
		// folder we won't consider accessing them a vulnerability. However, if you
		// use the `proxy` feature, it gets more dangerous because it can expose
		// remote code execution vulnerabilities in backends like Django and Rails.
		// So we will disable the host check normally, but enable it if you have
		// specified the `proxy` setting. Finally, we let you override it if you
		// really know what you're doing with a special environment variable.
		// Note: ["localhost", ".localhost"] will support subdomains - but we might
		// want to allow setting the allowedHosts manually for more complex setups
		allowedHosts: disableFirewall ? 'all' : [allowedHost],
		// Enable HTTPS if the HTTPS environment variable is set to 'true'
		server,
		host,
		port,
		// Allow cross-origin HTTP requests
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': '*',
			'Access-Control-Allow-Headers': '*'
		},
		static: [
			{
				// By default WebpackDevServer serves physical files from current directory
				// in addition to all the virtual build products that it serves from memory.
				// This is confusing because those files won’t automatically be available in
				// production build folder unless we copy them. However, copying the whole
				// project directory is dangerous because we may expose sensitive files.
				// Instead, we establish a convention that only files in `public` directory
				// get served. Our build script will copy `public` into the `build` folder.
				// In `index.html`, you can get URL of `public` folder with %PUBLIC_URL%:
				// <link rel="icon" href="%PUBLIC_URL%/favicon.ico">
				// In JavaScript code, you can access it with `process.env.PUBLIC_URL`.
				// Note that we only recommend to use `public` folder as an escape hatch
				// for files like `favicon.ico`, `manifest.json`, and libraries that are
				// for some reason broken when imported through webpack. If you just want to
				// use an image, put it in `src` and `import` it from JavaScript instead.
				directory: path.resolve(app.context, 'public'),
				publicPath,
				// By default files from `contentBase` will not trigger a page reload.
				watch: {
					// Reportedly, this avoids CPU overload on some systems.
					// https://github.com/facebook/create-react-app/issues/293
					// src/node_modules is not ignored to support absolute imports
					// https://github.com/facebook/create-react-app/issues/1065
					ignored: [
						ignoredFiles(path.resolve(app.context, 'src')),
						'/node_modules[\\/](?!@enact[\\/](?!.*node_modules))/'
					]
				}
			},
			{
				directory: path.resolve(app.context, '__mocks__'),
				publicPath,
				// By default files from `contentBase` will not trigger a page reload.
				watch: {
					// Reportedly, this avoids CPU overload on some systems.
					// https://github.com/facebook/create-react-app/issues/293
					// src/node_modules is not ignored to support absolute imports
					// https://github.com/facebook/create-react-app/issues/1065
					ignored: [
						ignoredFiles(path.resolve(app.context, 'src')),
						'/node_modules[\\/](?!@enact[\\/](?!.*node_modules))/'
					]
				}
			}
		],
		client: {
			webSocketURL: {
				// Enable custom sockjs pathname for websocket connection to hot reloading server.
				// Enable custom sockjs hostname, pathname and port for websocket connection
				// to hot reloading server.
				hostname: process.env.WDS_SOCKET_HOST,
				pathname: process.env.WDS_SOCKET_PATH,
				port: process.env.WDS_SOCKET_PORT
			},
			overlay: {
				errors: true,
				warnings: false,
				runtimeErrors: false
			}
		},
		devMiddleware: {
			// It is important to tell WebpackDevServer to use the same "publicPath" path as
			// we specified in the webpack config. When homepage is '.', default to serving
			// from the root.
			// remove last slash so user can land on `/test` instead of `/test/`
			publicPath: publicPath.slice(0, -1)
		},
		historyApiFallback: {
			// ensure JSON file requests correctly 404 error when not found.
			rewrites: [{from: /.*\.json$/, to: context => context.parsedUrl.pathname}],
			// Paths with dots should still use the history fallback.
			// See https://github.com/facebookincubator/create-react-app/issues/387.
			disableDotRule: true,
			index: publicPath
		},
		// `proxy` is run between `before` and `after` `webpack-dev-server` hooks
		proxy,
		setupMiddlewares (middlewares, devServer) {
			if (!devServer) {
				throw new Error('webpack-dev-server is not defined');
			}

			// Optionally register app-side proxy middleware if it exists
			const proxySetup = path.join(process.cwd(), 'src', 'setupProxy.js');
			if (fs.existsSync(proxySetup)) {
				require(proxySetup)(devServer.app);
			}

			middlewares.unshift(
				// Keep `evalSourceMapMiddleware`
				// middlewares before `redirectServedPath` otherwise will not have any effect
				// This lets us fetch source contents from webpack for the error overlay
				evalSourceMapMiddleware(devServer)
			);

			middlewares.push(
				// Redirect to `PUBLIC_URL` or `homepage`/`enact.publicUrl` from `package.json`
				// if url not match
				redirectServedPathMiddleware(publicPath)
			);

			return middlewares;
		}
	};
}

function serve (config, host, port, open) {
	// We attempt to use the default port but if it is busy, we offer the user to
	// run on a different port. `detect()` Promise resolves to the next free port.
	return choosePort(host, port).then(resolvedPort => {
		if (resolvedPort == null) {
			// We have not found a port.
			return Promise.reject(new Error('Could not find a free port for the dev-server.'));
		}
		const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
		const publicPath = getPublicUrlOrPath(true, app.publicUrl, process.env.PUBLIC_URL);
		const urls = prepareUrls(protocol, host, resolvedPort, publicPath.slice(0, -1));

		// Create a webpack compiler that is configured with custom messages.
		const compiler = createCompiler({
			appName: app.name,
			config,
			urls,
			useYarn: false,
			useTypeScript: fs.existsSync('tsconfig.json'),
			webpack
		});
		// Hook into compiler to remove potentially confusing messages
		compiler.hooks.afterEmit.tapAsync('EnactCLI', (compilation, callback) => {
			compilation.warnings.forEach(w => {
				if (w.message) {
					// Remove any --fix ESLintinfo messages since the eslint-loader config is
					// internal and eslist is used in an embedded context.
					const eslintFix = /\n.* potentially fixable with the `--fix` option./gm;
					w.message = w.message.replace(eslintFix, '');
				}
			});
			callback();
		});
		// Load proxy config
		const proxySetting = app.proxy;
		const proxyConfig = prepareProxy(proxySetting, './public', publicPath);
		// Serve webpack assets generated by the compiler over a web sever.
		const serverConfig = Object.assign(
			{},
			devServerConfig(host, resolvedPort, protocol, publicPath, proxyConfig, urls.lanUrlForConfig)
		);
		const devServer = new WebpackDevServer(serverConfig, compiler);
		// Launch WebpackDevServer.
		devServer.startCallback(err => {
			if (err) return console.log(err);
			if (process.stdout.isTTY) clearConsole();
			console.log(chalk.cyan('Starting the development server...\n'));
			if (open) {
				openBrowser(urls.localUrlForBrowser);
			}
		});

		['SIGINT', 'SIGTERM'].forEach(sig => {
			process.on(sig, () => {
				devServer.stopCallback(() => {});
				process.exit();
			});
		});

		if (process.env.CI !== 'true') {
			// Gracefully exit when stdin ends
			process.stdin.on('end', () => {
				devServer.stopCallback(() => {});
				process.exit();
			});
		}
	});
}

function api (opts) {
	if (opts.meta) {
		let meta;
		try {
			meta = JSON.parse(opts.meta);
		} catch (e) {
			throw new Error('Invalid metadata; must be a valid JSON string.\n' + e.message);
		}
		app.applyEnactMeta(meta);
	}

	// We can disable the typechecker formatter since react-dev-utils includes their
	// own formatter in their dev client.
	process.env.DISABLE_TSFORMATTER = 'true';

	// Use inline styles for serving process.
	process.env.INLINE_STYLES = 'true';

	// Setup the development config with additional webpack-dev-server customizations.
	const configFactory = require('../config/webpack.config');
	const fastRefresh = process.env.FAST_REFRESH || opts.fast;
	const config = hotDevServer(configFactory('development', !opts.linting), fastRefresh);

	// Tools like Cloud9 rely on this.
	const host = process.env.HOST || opts.host || '0.0.0.0';
	const port = parseInt(process.env.PORT || opts.port || 8080);

	// Start serving
	if (['node', 'async-node', 'webworker'].includes(app.environment)) {
		return Promise.reject(new Error('Serving is not supported for non-browser apps.'));
	} else {
		return serve(config, host, port, opts.browser);
	}
}

function cli (args) {
	const opts = minimist(args, {
		string: ['host', 'port', 'meta'],
		boolean: ['browser', 'fast', 'help', 'linting'],
		default: {linting: true},
		alias: {b: 'browser', i: 'host', p: 'port', f: 'fast', m: 'meta', h: 'help'}
	});
	if (opts.help) displayHelp();

	process.chdir(app.context);

	import('chalk').then(({default: _chalk}) => {
		chalk = _chalk;
		api(opts).catch(err => {
			// console.error(chalk.red('ERROR: ') + (err.message || err));
			console.log(err);
			process.exit(1);
		});
	});
}

module.exports = {api, cli};
if (require.main === module) cli(process.argv.slice(2));
