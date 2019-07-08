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

function normalize(items, context) {

    function *flatTraverse(array) {
        for (const item of array) {
            if (Array.isArray(item)) {
                yield* flatTraverse(item);
            } else {
                yield item;
            }
        }
    }

    // TODO: Execute config functions

    return [...flatTraverse(items)];
}


function pathMatches(relativeFilePath, config) {

    // check for all matches to config.files
    let matches = config.files.some(pattern => {
        return minimatch(relativeFilePath, pattern, MINIMATCH_OPTIONS)
    });

    /*
     * If the file path matches the config.files patterns, then check to see
     * if there are any files to ignore.
     */
    if (matches && config.ignores) {
        matches = !config.ignores.some(pattern => {
            return minimatch(relativeFilePath, pattern, MINIMATCH_OPTIONS)
        });
    }

    return matches;
}

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
const rules = Symbol("rules");
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
     * @param {Object} [options.schemaDefs] The additional schema 
     *      definitions to use for the ConfigArray schema.
     */
    constructor(configs, { basePath = "", normalized = false, schemaDefs } = {}) {
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
            ...baseSchema,
            ...schemaDefs
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
     * @param {ConfigContext} context The context object for configs.
     * @returns {ConfigArray} A new ConfigArray instance that is normalized.
     */
    async normalize(context = {}) {

        if (!this.isNormalized()) {
            const normalizedConfigs = normalize(this);
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
            if (!config.files || pathMatches(relativeFilePath, config)) {
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
