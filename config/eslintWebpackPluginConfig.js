const eslintConfigEnact = require('eslint-config-enact/index');
const eslintConfigEnactStrict = require('eslint-config-enact/strict');

// Check if JSX transform is able
const hasJsxRuntime = (() => {
	if (process.env.DISABLE_NEW_JSX_TRANSFORM === 'true') {
		return false;
	}

	try {
		require.resolve('react/jsx-runtime');
		return true;
	} catch (e) {
		return false;
	}
})();

const loadedEnactConfig = process.env.FRAMEWORK === true ? eslintConfigEnactStrict : eslintConfigEnact;

module.exports = [
	...loadedEnactConfig,
	{
		rules: {
			...(!hasJsxRuntime && {
				'react/jsx-uses-react': 'warn',
				'react/react-in-jsx-scope': 'warn'
			})
		}
	}
];
