/**
 * @fileoverview ConfigArray
 * @author Nicholas C. Zakas
 */

//------------------------------------------------------------------------------
// Imports
//------------------------------------------------------------------------------

import path from "path";
import minimatch from "minimatch";
import createDebug from "debug";

import { ObjectSchema } from "@humanwhocodes/object-schema";
import { baseSchema } from "./base-schema.js";

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

const debug = createDebug("@hwc/config-array");

const MINIMATCH_OPTIONS = {
    matchBase: true
};


/**
 * Normalizes a `ConfigArray` by flattening it and executing any functions
 * that are found inside.
 * @param {Array} items The items in a `ConfigArray`.
 * @param {Object} context The context object to pass into any function
 *      found.
 * @returns {Array} A flattened array containing only config objects.
 * @throws {TypeError} When a config function returns a function.
 */
async function normalize(items, context) {

    // TODO: Allow async config functions

    function *flatTraverse(array) {
        for (let item of array) {
            if (typeof item === "function") {
                item = item(context);
            }
            
            if (Array.isArray(item)) {
                yield* flatTraverse(item);
            } else if (typeof item === "function") {
                throw new TypeError("A config function can only return an object or array.");
            } else  {
                yield item;
            }
        }
    }

    // TODO: Execute config functions

    return [...flatTraverse(items)];
}

/**
 * Determines if a given file path is matched by a config. If the config
 * has no `files` field, then it matches; otherwise, if a `files` field
 * is present then we match the globs in `files` and exclude any globs in
 * `ignores`.
 * @param {string} relativeFilePath The file path to check relative to
 *      the `ConfigArray` `basePath` option.
 * @param {Object} config The config object to check.
 * @returns {boolean} True if the file path is matched by the config,
 *      false if not.
 */
function pathMatches(relativeFilePath, config) {

    // a config without a `files` field always matches
    if (!config.files) {
        return true;
    }

    // if files isn't an array, throw an error
    if (!Array.isArray(config.files) || config.files.length === 0) {
        throw new TypeError("The files key must be a non-empty array.");
    }

    // check for all matches to config.files
    let matches = config.files.some(pattern => {
        if (typeof pattern === "string") {
            return minimatch(relativeFilePath, pattern, MINIMATCH_OPTIONS);
        }

        // otherwise it's an array where we need to AND the patterns
        return pattern.every(subpattern => {
            return minimatch(relativeFilePath, subpattern, MINIMATCH_OPTIONS);
        });
    });

    /*
     * If the file path matches the config.files patterns, then check to see
     * if there are any files to ignore.
     */
    if (matches && config.ignores) {
        matches = !config.ignores.some(pattern => {
            return minimatch(relativeFilePath, pattern, MINIMATCH_OPTIONS);
        });
    }

    return matches;
}

/**
 * Ensures that a ConfigArray has been normalized.
 * @param {ConfigArray} configArray The ConfigArray to check. 
 * @returns {void}
 * @throws {Error} When the `ConfigArray` is not normalized.
 */
function assertNormalized(configArray) {
    // TODO: Throw more verbose error
    if (!configArray.isNormalized()) {
        throw new Error("ConfigArray must be normalized to perform this operation.");
    }
}

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

const isNormalized = Symbol("isNormalized");
const configCache = Symbol("configCache");
const schema = Symbol("schema");

/**
 * Represents an array of config objects and provides method for working with
 * those config objects.
 */
export class ConfigArray extends Array {

    /**
     * Creates a new instance of ConfigArray.
     * @param {Iterable|Function|Object} configs An iterable yielding config
     *      objects, or a config function, or a config object.
     * @param {string} [options.basePath=""] The path of the config file
     * @param {boolean} [options.normalized=false] Flag indicating if the
     *      configs have already been normalized.
     * @param {Object} [options.schema] The additional schema 
     *      definitions to use for the ConfigArray schema.
     */
    constructor(configs, { basePath = "", normalized = false, schema: customSchema } = {}) {
        super();

        /**
         * Tracks if the array has been normalized.
         * @property isNormalized
         * @type boolean
         * @private
         */
        this[isNormalized] = normalized;
        
        /**
         * The schema used for validating and merging configs.
         * @property schema
         * @type ObjectSchema
         * @private
         */
        this[schema] = new ObjectSchema({
            ...customSchema,
            ...baseSchema
        });

        /**
         * The path of the config file that this array was loaded from.
         * This is used to calculate filename matches.
         * @property basePath
         * @type string
         */
        this.basePath = basePath;
        
        /**
         * A cache to store calculated configs for faster repeat lookup.
         * @property configCache
         * @type Map
         * @private
         */
        this[configCache] = new Map();
        
        // load the configs into this array
        if (Array.isArray(configs)) {
            this.push(...configs);
        } else {
            this.push(configs);
        }

    }

    /**
     * Prevent normal array methods from creating a new `ConfigArray` instance.
     * This is to ensure that methods such as `slice()` won't try to create a 
     * new instance of `ConfigArray` behind the scenes as doing so may throw
     * an error due to the different constructor signature.
     * @returns {Function} The `Array` constructor.
     */
    static get [Symbol.species]() {
        return Array;
    }

    /**
     * Returns the `files` globs from every config object in the array.
     * This can be used to determine which files will be matched by a
     * config array.
     * @returns {string[]} An array of string patterns.
     */
    get files() {

        assertNormalized(this);

        const result = [];

        for (const config of this) {
            if (config.files) {
                result.push(...config.files);
            }
        }

        return result;
    }

    /**
     * Returns the file globs that should always be ignored regardless of
     * the matching `files` fields in any configs. This is necessary to mimic
     * the behavior of things like .gitignore and .eslintignore, allowing a
     * globbing operation to be faster.
     * @returns {string[]} An array of string patterns to be ignored.
     */
    get ignores() {

        assertNormalized(this);

        const result = [];

        for (const config of this) {
            if (config.ignores && !config.files) {
                result.push(...config.ignores);
            }
        }

        return result;
    }

    /**
     * Indicates if the config array has been normalized.
     * @returns {boolean} True if the config array is normalized, false if not.
     */
    isNormalized() {
        return this[isNormalized];
    }

    /**
     * Normalizes a config array by flattening embedded arrays and executing
     * config functions.
     * @param {ConfigContext} context The context object for config functions.
     * @returns {ConfigArray} A new ConfigArray instance that is normalized.
     */
    async normalize(context = {}) {

        if (!this.isNormalized()) {
            const normalizedConfigs = await normalize(this, context);
            this.length = 0;
            this.push(...normalizedConfigs);
            this[isNormalized] = true;        

            // prevent further changes
            Object.freeze(this);
        }

        return this;
    }

    /**
     * Returns the config object for a given file path.
     * @param {string} filePath The complete path of a file to get a config for.
     * @returns {Object} The config object for this file.
     */
    getConfig(filePath) {

        assertNormalized(this);

        // first check the cache to avoid duplicate work
        let finalConfig = this[configCache].get(filePath);

        if (finalConfig) {
            return finalConfig;
        }

        // No config found in cache, so calculate a new one

        const matchingConfigs = [];
        const relativeFilePath = path.relative(this.basePath, filePath);

        for (const config of this) {
            if (pathMatches(relativeFilePath, config)) {
                debug(`Matching config found for ${relativeFilePath}`);
                matchingConfigs.push(config);
            } else {
                debug(`No matching config found for ${relativeFilePath}`);
            }
        }

        finalConfig = matchingConfigs.reduce((result, config) => {
            return this[schema].merge(result, config);
        }, {}, this);

        this[configCache].set(filePath, finalConfig);

        return finalConfig;
    }

}
