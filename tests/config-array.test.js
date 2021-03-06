/**
 * @fileoverview Tests for ConfigArray object.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { ConfigArray, ConfigArraySymbol } from '../src/config-array.js';
import path from 'path';
import chai from 'chai';

const expect = chai.expect;

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

const basePath = __dirname;

const schema = {
	language: {
		required: false,
		validate(value) {
			if (typeof value !== 'function') {
				throw new TypeError('Expected a function.');
			}
		},
		merge(a, b) {
			if (!b) {
				return a;
			}

			if (!a) {
				return b;
			}
		}
	},
	defs: {
		required: false,
		validate(value) {
			if (!value || typeof value !== 'object') {
				throw new TypeError('Object expected.');
			}
		},
		merge(a, b) {
			return {
				...a,
				...b
			};
		}
	}
};

const JSLanguage = class {};
const CSSLanguage = class {};
const MarkdownLanguage = class {};
const JSONLanguage = class {};

function createConfigArray(options) {
	return new ConfigArray([
		{
			files: ['**/*.js'],
			language: JSLanguage
		},
		{
			files: ['**/*.json'],
			language: JSONLanguage
		},
		{
			files: ['**/*.css'],
			language: CSSLanguage
		},
		{
			files: ['**/*.md', '**/.markdown'],
			language: MarkdownLanguage
		},
		{},
		{
			files: ['!*.css'],
			defs: {
				css: false
			}
		},
		{
			ignores: ['tests/fixtures/**'],
			defs: {
				name: 'config-array'
			}
		},
		{
			ignores: ['node_modules/**']
		},
		{
			files: ['foo.test.js'],
			defs: {
				name: 'config-array.test'
			}
		},
		function(context) {
			return {
				files: ['bar.test.js'],
				defs: {
					name: context.name
				}
			};
		},
		function(context) {
			return [
				{
					files: ['baz.test.js'],
					defs: {
						name: 'baz-' + context.name
					}
				},
				{
					files: ['boom.test.js'],
					defs: {
						name: 'boom-' + context.name
					}
				}
			];
		},
		{
			files: [['*.and.*', '*.js']],
			defs: {
				name: 'AND operator'
			}
		},
		{
			files: [filePath => filePath.endsWith('.html')],
			defs: {
				name: 'HTML'
			}
		},
		{
			ignores: [filePath => filePath.endsWith('.gitignore')],
			defs: {
				ignored: '.gitignore'
			}
		}
	], {
		basePath,
		schema,
		...options
	});
}

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe('ConfigArray', () => {

	let configs,
		unnormalizedConfigs;

	beforeEach(() => {
		unnormalizedConfigs = new ConfigArray([], { basePath });
		configs = createConfigArray();
		return configs.normalize({
			name: 'from-context'
		});
	});

	describe('Validation', () => {
		it('should throw an error when files is not an array', async () => {
			configs = new ConfigArray([
				{
					files: '*.js'
				}
			], { basePath });
			await configs.normalize();

			expect(() => {
				configs.getConfig('foo.js');
			})
				.to
				.throw(/non-empty array/);

		});

		it('should throw an error when files is an empty array', async () => {
			configs = new ConfigArray([
				{
					files: []
				}
			], { basePath });
			await configs.normalize();

			expect(() => {
				configs.getConfig('foo.js');
			})
				.to
				.throw(/non-empty array/);

		});
	});

	describe('ConfigArray members', () => {

		beforeEach(() => {
			configs = createConfigArray();
			return configs.normalize({
				name: 'from-context'
			});
		});

		describe('ConfigArraySymbol.finalizeConfig', () => {
			it('should allow finalizeConfig to alter config before returning when calling normalize()', async () => {

				configs = createConfigArray();
				configs[ConfigArraySymbol.finalizeConfig] = () => {
					return {
						name: 'from-finalize'
					};
				};

				await configs.normalize({
					name: 'from-context'
				});

				const filename = path.resolve(basePath, 'foo.js');
				const config = configs.getConfig(filename);
				expect(config.name).to.equal('from-finalize');
			});

			it('should allow finalizeConfig to alter config before returning when calling normalizeSync()', async () => {

				configs = createConfigArray();
				configs[ConfigArraySymbol.finalizeConfig] = () => {
					return {
						name: 'from-finalize'
					};
				};

				configs.normalizeSync({
					name: 'from-context'
				});

				const filename = path.resolve(basePath, 'foo.js');
				const config = configs.getConfig(filename);
				expect(config.name).to.equal('from-finalize');
			});

		});

		describe('ConfigArraySymbol.preprocessConfig', () => {
			it('should allow preprocessConfig to alter config before returning', async () => {

				configs = createConfigArray();
				configs.push('foo:bar');

				configs[ConfigArraySymbol.preprocessConfig] = config => {

					if (config === 'foo:bar') {
						return {
							defs: {
								name: 'foo:bar'
							}
						};
					}

					return config;
				};

				await configs.normalize({
					name: 'from-context'
				});

				const filename = path.resolve(basePath, 'foo.js');
				const config = configs.getConfig(filename);
				expect(config.defs.name).to.equal('foo:bar');
			});

		});

		describe('basePath', () => {
			it('should store basePath property when basePath is provided', () => {
				expect(unnormalizedConfigs.basePath).to.equal(basePath);
				expect(configs.basePath).to.equal(basePath);
			});
		});

		describe('isNormalized()', () => {
			it('should return true when the config array is normalized', () => {
				expect(configs.isNormalized()).to.be.true;
			});

			it('should return false when the config array is not normalized', () => {
				expect(unnormalizedConfigs.isNormalized()).to.be.false;
			});
		});

		describe('getConfig()', () => {

			it('should throw an error when not normalized', () => {
				const filename = path.resolve(basePath, 'foo.js');

				expect(() => {
					unnormalizedConfigs.getConfig(filename);
				})
					.to
					.throw(/normalized/);
			});

			it('should calculate correct config when passed JS filename', () => {
				const filename = path.resolve(basePath, 'foo.js');

				const config = configs.getConfig(filename);

				expect(config.language).to.equal(JSLanguage);
				expect(config.defs).to.be.an('object');
				expect(config.defs.name).to.equal('config-array');
				expect(config.defs.css).to.be.false;
			});

			it('should calculate correct config when passed HTML filename', () => {
				const filename = path.resolve(basePath, 'foo.html');

				const config = configs.getConfig(filename);

				expect(config.defs).to.be.an('object');
				expect(config.defs.name).to.equal('HTML');
				expect(config.defs.ignored).to.equal('.gitignore');
			});

			it('should calculate correct config when passed .gitignore filename', () => {
				const filename = path.resolve(basePath, '.gitignore');

				const config = configs.getConfig(filename);

				expect(config.defs).to.be.an('object');
				expect(config.defs.name).to.equal('config-array');
				expect(config.defs.ignored).to.equal('.gitignore');
			});

			it('should calculate correct config when passed JS filename that matches two configs', () => {
				const filename = path.resolve(basePath, 'foo.test.js');

				const config = configs.getConfig(filename);

				expect(config.language).to.equal(JSLanguage);
				expect(config.defs).to.be.an('object');
				expect(config.defs.name).to.equal('config-array.test');
				expect(config.defs.css).to.be.false;
			});

			it('should calculate correct config when passed JS filename that matches a function config', () => {
				const filename = path.resolve(basePath, 'bar.test.js');

				const config = configs.getConfig(filename);

				expect(config.language).to.equal(JSLanguage);
				expect(config.defs).to.be.an('object');
				expect(config.defs.name).to.equal('from-context');
				expect(config.defs.css).to.be.false;
			});

			it('should calculate correct config when passed JS filename that matches a async function config', () => {
				const configs = createConfigArray();
				configs.push(context => {
					return Promise.resolve([
						{
							files: ['async.test.js'],
							defs: {
								name: 'async-' + context.name
							}
						}
					]);
				});

				expect(() => {
					configs.normalizeSync();
				})
					.to
					.throw(/Async config functions are not supported/);
			});

			it('should throw an error when passed JS filename that matches a async function config and normalizeSync() is called', async () => {
				const filename = path.resolve(basePath, 'async.test.js');
				const configs = createConfigArray();
				configs.push(context => {
					return Promise.resolve([
						{
							files: ['async.test.js'],
							defs: {
								name: 'async-' + context.name
							}
						}
					]);
				});

				await configs.normalize({
					name: 'from-context'
				});

				const config = configs.getConfig(filename);

				expect(config.language).to.equal(JSLanguage);
				expect(config.defs).to.be.an('object');
				expect(config.defs.name).to.equal('async-from-context');
				expect(config.defs.css).to.be.false;
			});

			it('should calculate correct config when passed JS filename that matches a function config returning an array', () => {
				const filename1 = path.resolve(basePath, 'baz.test.js');
				const config1 = configs.getConfig(filename1);

				expect(config1.language).to.equal(JSLanguage);
				expect(config1.defs).to.be.an('object');
				expect(config1.defs.name).to.equal('baz-from-context');

				const filename2 = path.resolve(basePath, 'baz.test.js');
				const config2 = configs.getConfig(filename2);

				expect(config2.language).to.equal(JSLanguage);
				expect(config2.defs).to.be.an('object');
				expect(config2.defs.name).to.equal('baz-from-context');
				expect(config2.defs.css).to.be.false;
			});

			it('should calculate correct config when passed CSS filename', () => {
				const filename = path.resolve(basePath, 'foo.css');

				const config = configs.getConfig(filename);
				expect(config.language).to.equal(CSSLanguage);
				expect(config.defs).to.be.an('object');
				expect(config.defs.name).to.equal('config-array');

			});

			it('should calculate correct config when passed JS filename that matches AND pattern', () => {
				const filename = path.resolve(basePath, 'foo.and.js');

				const config = configs.getConfig(filename);
				expect(config.language).to.equal(JSLanguage);
				expect(config.defs).to.be.an('object');
				expect(config.defs.name).to.equal('AND operator');
				expect(config.defs.css).to.be.false;
			});

			it('should return the same config when called with the same filename twice', () => {
				const filename = path.resolve(basePath, 'foo.js');

				const config1 = configs.getConfig(filename);
				const config2 = configs.getConfig(filename);

				expect(config1).to.equal(config2);
			});

		});

		describe('files', () => {

			it('should throw an error when not normalized', () => {
				expect(() => {
					unnormalizedConfigs.files;
				})
					.to
					.throw(/normalized/);
			});

			it('should return all string pattern file from all configs when called', () => {
				const expectedFiles = configs.reduce((list, config) => {
					if (config.files) {
						config.files.forEach(filePatterns => {
							if (Array.isArray(filePatterns)) {
								list.push(...filePatterns.filter(pattern => {
									return typeof pattern === 'string' && !pattern.startsWith('!');
								}));
							} else if (typeof filePatterns !== 'function') {
								if (!filePatterns.startsWith('!')) {
									list.push(filePatterns);
								}
							}
						});
					}

					return list;
				}, []);
				const files = configs.files;
				expect(files).to.deep.equal(expectedFiles);

			});
		});

		describe('ignores', () => {

			it('should throw an error when not normalized', () => {
				expect(() => {
					unnormalizedConfigs.ignores;
				})
					.to
					.throw(/normalized/);
			});

			it('should return all ignores from all configs without files when called', () => {
				const expectedIgnores = configs.reduce((list, config) => {
					if (config.ignores && !config.files) {
						list.push(...config.ignores.filter(pattern => typeof pattern === 'string'));
					}

					return list;
				}, []);
				const ignores = configs.ignores;
				expect(ignores).to.deep.equal(expectedIgnores);

			});
		});

		describe('push()', () => {

			it('should throw an error when normalized', () => {
				expect(() => {
					configs.push({});
				})
					.to
					.throw(/extensible/);
			});

		});

	});

});
