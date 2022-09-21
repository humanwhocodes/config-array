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
			files: ['**/*.xsl'],
			ignores: ['fixtures/test.xsl'],
			defs: {
				xsl: true
			}
		},
		{
			files: ['tests/**/*.xyz'],
			defs: {
				xyz: true
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
			ignores: [filePath => filePath.endsWith('.gitignore')]
		}
	], {
		basePath,
		schema,
		extraConfigTypes: ['array', 'function'],
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
		unnormalizedConfigs = new ConfigArray([], { basePath, extraConfigTypes: ['array', 'function'] });
		configs = createConfigArray();
		return configs.normalize({
			name: 'from-context'
		});
	});

	describe('Config Types Validation', () => {
		it('should not throw an error when objects are allowed', async () => {
			configs = new ConfigArray([
				{
					files: '*.js'
				}
			], {
				basePath
			});
			await configs.normalize();

		});

		it('should not throw an error when arrays are allowed', async () => {
			configs = new ConfigArray([
				[
					{
						files: '*.js'
					}
				]
			], {
				basePath,
				extraConfigTypes: ['array']
			});
			await configs.normalize();

		});

		it('should not throw an error when functions are allowed', async () => {
			configs = new ConfigArray([
				() => ({})
			], {
				basePath,
				extraConfigTypes: ['function']
			});
			await configs.normalize();

		});

		it('should throw an error in normalize() when arrays are not allowed', done => {

			configs = new ConfigArray([
				[
					{
						files: '*.js'
					}
				]
			], {
				basePath
			});

			configs
				.normalize()
				.then(() => {
					throw new Error('Missing error.');
				})
				.catch(ex => {
					expect(ex).matches(/Unexpected array/);
					done();
				});

		});

		it('should throw an error in normalizeSync() when arrays are not allowed', () => {

			configs = new ConfigArray([
				[
					{
						files: '*.js'
					}
				]
			], {
				basePath
			});

			expect(() => {
				configs.normalizeSync();
			})
				.throws(/Unexpected array/);

		});

		it('should throw an error in normalize() when functions are not allowed', done => {

			configs = new ConfigArray([
				() => ({})
			], {
				basePath
			});

			configs
				.normalize()
				.then(() => {
					throw new Error('Missing error.');
				})
				.catch(ex => {
					expect(ex).matches(/Unexpected function/);
					done();
				});

		});

		it('should throw an error in normalizeSync() when functions are not allowed', () => {

			configs = new ConfigArray([
				() => {}
			], {
				basePath
			});

			expect(() => {
				configs.normalizeSync();
			})
				.throws(/Unexpected function/);

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
				configs.getConfig(path.resolve(basePath, 'foo.js'));
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
				configs.getConfig(path.resolve(basePath, 'foo.js'));
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

			it('should have "this" inside of function be equal to config array when calling normalize()', async () => {

				configs = createConfigArray();
				configs.push('foo:bar');
				let internalThis;

				configs[ConfigArraySymbol.preprocessConfig] = function(config) {
					internalThis = this;

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

				expect(internalThis).to.equal(configs);
			});

			it('should have "this" inside of function be equal to config array when calling normalizeSync()', async () => {

				configs = createConfigArray();
				configs.push('foo:bar');
				let internalThis;

				configs[ConfigArraySymbol.preprocessConfig] = function(config) {
					internalThis = this;

					if (config === 'foo:bar') {
						return {
							defs: {
								name: 'foo:bar'
							}
						};
					}

					return config;
				};

				configs.normalizeSync({
					name: 'from-context'
				});

				expect(internalThis).to.equal(configs);
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

			it('should calculate correct config when passed XYZ filename', () => {
				const filename = path.resolve(basePath, 'tests/.bar/foo.xyz');

				const config = configs.getConfig(filename);

				expect(config.defs).to.be.an('object');
				expect(config.defs.name).to.equal('config-array');
				expect(config.defs.xyz).to.be.true;
			});

			it('should calculate correct config when passed HTML filename', () => {
				const filename = path.resolve(basePath, 'foo.html');

				const config = configs.getConfig(filename);

				expect(config.defs).to.be.an('object');
				expect(config.defs.name).to.equal('HTML');
			});

			it('should return undefined when passed ignored .gitignore filename', () => {
				const filename = path.resolve(basePath, '.gitignore');

				const config = configs.getConfig(filename);

				expect(config).to.be.undefined;
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

			it('should not match a filename that doesn\'t explicitly match a files pattern', () => {
				const matchingFilename = path.resolve(basePath, 'foo.js');
				const notMatchingFilename = path.resolve(basePath, 'foo.md');
				configs = new ConfigArray([
					{},
					{
						files: ['**/*.js']
					}
				], { basePath, schema });

				configs.normalizeSync();

				const config1 = configs.getConfig(matchingFilename);
				expect(config1).to.be.an('object');

				const config2 = configs.getConfig(notMatchingFilename);
				expect(config2).to.be.undefined;
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

			it('should return the same config when called with the same filename twice (caching)', () => {
				const filename = path.resolve(basePath, 'foo.js');

				const config1 = configs.getConfig(filename);
				const config2 = configs.getConfig(filename);

				expect(config1).to.equal(config2);
			});

			it('should return the same config when called with two filenames that match the same configs (caching)', () => {
				const filename1 = path.resolve(basePath, 'foo1.js');
				const filename2 = path.resolve(basePath, 'foo2.js');

				const config1 = configs.getConfig(filename1);
				const config2 = configs.getConfig(filename2);

				expect(config1).to.equal(config2);
			});

			it('should return empty config when called with ignored node_modules filename', () => {
				const filename = path.resolve(basePath, 'node_modules/foo.js');
				const config = configs.getConfig(filename);

				expect(config).to.be.undefined;
			});

		});

		describe('isIgnored()', () => {

			it('should throw an error when not normalized', () => {
				const filename = path.resolve(basePath, 'foo.js');

				expect(() => {
					unnormalizedConfigs.isIgnored(filename);
				})
					.to
					.throw(/normalized/);
			});

			it('should return false when passed JS filename', () => {
				const filename = path.resolve(basePath, 'foo.js');

				expect(configs.isIgnored(filename)).to.be.false;
			});

			it('should return true when passed JS filename in parent directory', () => {
				const filename = path.resolve(basePath, '../foo.js');

				expect(configs.isIgnored(filename)).to.be.true;
			});

			it('should return false when passed HTML filename', () => {
				const filename = path.resolve(basePath, 'foo.html');

				expect(configs.isIgnored(filename)).to.be.false;
			});

			it('should return true when passed ignored .gitignore filename', () => {
				const filename = path.resolve(basePath, '.gitignore');

				expect(configs.isIgnored(filename)).to.be.true;
			});

			it('should return false when passed CSS filename', () => {
				const filename = path.resolve(basePath, 'foo.css');

				expect(configs.isIgnored(filename)).to.be.false;
			});

			it('should return true when passed docx filename', () => {
				const filename = path.resolve(basePath, 'sss.docx');

				expect(configs.isIgnored(filename)).to.be.false;
			});

			it('should return true when passed ignored node_modules filename', () => {
				const filename = path.resolve(basePath, 'node_modules/foo.js');

				expect(configs.isIgnored(filename)).to.be.true;
			});

			it('should return true when passed matching both files and ignores in a config', () => {
				configs = new ConfigArray([
					{
						files: ['**/*.xsl'],
						ignores: ['fixtures/test.xsl'],
						defs: {
							xsl: true
						}
					}
				], { basePath });

				configs.normalizeSync();
				const filename = path.resolve(basePath, 'fixtures/test.xsl');

				expect(configs.isIgnored(filename)).to.be.true;
			});

			it('should return false when negated pattern comes after matching pattern', () => {
				configs = new ConfigArray([
					{
						files: ['**/foo.*'],
						ignores: ['**/*.txt', '!foo.txt']
					}
				], {
					basePath
				});

				configs.normalizeSync();

				expect(configs.isIgnored(path.join(basePath, 'bar.txt'))).to.be.true;
				expect(configs.isIgnored(path.join(basePath, 'foo.txt'))).to.be.false;
			});

			it('should return true when negated pattern comes before matching pattern', () => {
				configs = new ConfigArray([
					{
						ignores: ['!foo.txt', '**/*.txt']
					}
				], {
					basePath
				});

				configs.normalizeSync();

				expect(configs.isIgnored(path.join(basePath, 'bar.txt'))).to.be.true;
				expect(configs.isIgnored(path.join(basePath, 'foo.txt'))).to.be.true;
			});

			it('should return false when matching files and ignores has a negated pattern comes after matching pattern', () => {
				configs = new ConfigArray([
					{
						files: ['**/*.js'],
						ignores: ['**/*.test.js', '!foo.test.js']
					}
				], {
					basePath
				});

				configs.normalizeSync();

				expect(configs.isIgnored(path.join(basePath, 'bar.test.js'))).to.be.true;
				expect(configs.isIgnored(path.join(basePath, 'foo.test.js'))).to.be.false;
			});

		});

		describe('isExplicitMatch()', () => {

			it('should throw an error when not normalized', () => {
				const filename = path.resolve(basePath, 'foo.js');

				expect(() => {
					unnormalizedConfigs.isExplicitMatch(filename);
				})
					.to
					.throw(/normalized/);
			});

			it('should return true when passed JS filename', () => {
				const filename = path.resolve(basePath, 'foo.js');

				expect(configs.isExplicitMatch(filename)).to.be.true;
			});

			it('should return true when passed HTML filename', () => {
				const filename = path.resolve(basePath, 'foo.html');

				expect(configs.isExplicitMatch(filename)).to.be.true;
			});

			it('should return true when passed CSS filename', () => {
				const filename = path.resolve(basePath, 'foo.css');

				expect(configs.isExplicitMatch(filename)).to.be.true;
			});

			it('should return true when passed EXE filename because it matches !.css', () => {
				const filename = path.resolve(basePath, 'foo.exe');

				expect(configs.isExplicitMatch(filename)).to.be.true;
			});

			it('should return false when passed EXE filename because no explicit matches', () => {
				const filename = path.resolve(basePath, 'foo.exe');
				configs = new ConfigArray([
					{
						files: ['*.js']
					}
				], {
					basePath
				});
				configs.normalizeSync();

				expect(configs.isExplicitMatch(filename)).to.be.false;
			});

			it('should return false when passed matching both files and ignores in a config', () => {
				configs = new ConfigArray([
					{
						files: ['**/*.xsl'],
						ignores: ['fixtures/test.xsl'],
						defs: {
							xsl: true
						}
					}
				], { basePath });

				configs.normalizeSync();
				const filename = path.resolve(basePath, 'fixtures/test.xsl');

				expect(configs.isExplicitMatch(filename)).to.be.false;
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
						list.push(...config.files);
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
					if (config.ignores && Object.keys(config).length === 1) {
						list.push(...config.ignores);
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
