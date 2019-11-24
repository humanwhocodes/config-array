
/**
 * @fileoverview Tests for ConfigArray object.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { ConfigArray } from "../src/config-array.js";
import path from "path";
import chai from "chai";

const expect = chai.expect;

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

const basePath = path.dirname(import.meta.url);

const schema = {
    language: {
        required: false,
        validate(value) {
            if (typeof value !== "function") {
                throw new TypeError("Expected a function.");
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
            if (!value || typeof value !== "object") {
                throw new TypeError("Object expected.");
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

function createConfigArray() {
    return new ConfigArray([{
            files: ["**/*.js"],
            language: JSLanguage
        }, {
            files: ["**/*.json"],
            language: JSONLanguage
        }, {
            files: ["**/*.css"],
            language: CSSLanguage
        }, {
            files: ["**/*.md", "**/.markdown"],
            language: MarkdownLanguage
        }, {
            defs: {
                name: "config-array"
            }
        }], {
        basePath: path.dirname(import.meta.url),
        schema
    });
}

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("ConfigArray", () => {

    let configs;

    beforeEach(async () => {
        configs = createConfigArray();
        await configs.normalize();
    });

    describe("getConfig()", () => {
    
        it("should calculate correct config when passed JS filename", () => {
            const filename = path.resolve(basePath, "foo.js");

            const config = configs.getConfig(filename);
            
            expect(config.language).to.equal(JSLanguage);
            expect(config.defs).to.be.an("object");
            expect(config.defs.name).to.equal("config-array");
        });

        it("should calculate correct config when passed CSS filename", () => {
            const filename = path.resolve(basePath, "foo.css");

            const config = configs.getConfig(filename);
            expect(config.language).to.equal(CSSLanguage);
            expect(config.defs).to.be.an("object");
            expect(config.defs.name).to.equal("config-array");

        });

        it("should return the same config when called with the same filename twice", () => {
            const filename = path.resolve(basePath, "foo.js");

            const config1 = configs.getConfig(filename);
            const config2 = configs.getConfig(filename);

            expect(config1).to.equal(config2);
        });


    });

});
