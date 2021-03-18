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
		throw new TypeError('Expected value to be an array.');
	}
}

/**
 * Assets that a given value is an array containing only strings and functions.
 * @param {*} value The value to check.
 * @returns {void}
 * @throws {TypeError} When the value is not an array of strings and functions.
 */
function assertIsArrayOfStringsAndFunctions(value, name) {
	assertIsArray(value, name);

	if (value.some(item => typeof item !== 'string' && typeof item !== 'function')) {
		throw new TypeError('Expected array to only contain strings.');
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
			if (typeof value !== 'string') {
				throw new TypeError('Property must be a string.');
			}
		}
	},
	files: {
		required: false,
		merge() {
			return undefined;
		},
		validate(value) {

			// first check if it's an array
			assertIsArray(value);

			// then check each member
			value.forEach(item => {
				if (Array.isArray(item)) {
					assertIsArrayOfStringsAndFunctions(item);
				} else if (typeof item !== 'string' && typeof item !== 'function') {
					throw new TypeError('Items must be a string, a function, or an array of strings and functions.');
				}
			});

		}
	},
	ignores: {
		required: false,
		merge() {
			return undefined;
		},
		validate: assertIsArrayOfStringsAndFunctions
	}
});
