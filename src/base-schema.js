/**
 * @fileoverview ConfigSchema
 * @author Nicholas C. Zakas
 */

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

function assertIsArray(value) {
    if (!Array.isArray(value)) {
        throw new TypeError("Expected value to be an array.");
    }
}

function assertIsArrayOfStrings(value, name) {
    assertIsArray(value, name);

    if (value.some(item => typeof item !== "string")) {
        throw new TypeError("Expected array to only contain strings.");
    }
}

//------------------------------------------------------------------------------
// Exports
//------------------------------------------------------------------------------

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
