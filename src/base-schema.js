/**
 * @fileoverview ConfigSchema
 * @author Nicholas C. Zakas
 */

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

/**
 * Assets that a given value is an array.
 * @param {*} value The value to check.
 * @returns {void}
 * @throws {TypeError} When the value is not an array. 
 */
function assertIsArray(value) {
    if (!Array.isArray(value)) {
        throw new TypeError("Expected value to be an array.");
    }
}

/**
 * Assets that a given value is an array containing only strings.
 * @param {*} value The value to check.
 * @returns {void}
 * @throws {TypeError} When the value is not an array of strings.
 */
function assertIsArrayOfStrings(value, name) {
    assertIsArray(value, name);

    if (value.some(item => typeof item !== "string")) {
        throw new TypeError("Expected array to only contain strings.");
    }
}

//------------------------------------------------------------------------------
// Exports
//------------------------------------------------------------------------------

/**
 * The base schema that every ConfigArray uses.
 * @type Object
 */
export const baseSchema = Object.freeze({
    name: {
        required: false,
        merge() {
            return undefined;
        },
        validate(value) {
            if (typeof value !== "string") {
                throw new TypeError("Property must be a string.");
            }
        }
    },
    files: {
        required: false,
        merge() {
            return undefined;
        },
        validate: assertIsArrayOfStrings
    },
    ignores: {
        required: false,
        merge() {
            return undefined;
        },
        validate: assertIsArrayOfStrings
    }
});
