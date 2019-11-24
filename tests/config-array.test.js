
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
        }, {
            files: ["foo.test.js"],
            defs: {
                name: "config-array.test"
            }
        }, function (context) {
            return {
                files: ["bar.test.js"],
                defs: {
                    name: context.name
                }
            };
        }, function (context) {
            return [{
                files: ["baz.test.js"],
                defs: {
                    name: "baz-" + context.name
                }
            }, {
                files: ["boom.test.js"],
                defs: {
                    name: "boom-" + context.name
                }
            }];
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
        await configs.normalize({
            name: "from-context"
        });
    });

    describe("getConfig()", () => {
    
        it("should calculate correct config when passed JS filename", () => {
            const filename = path.resolve(basePath, "foo.js");

            const config = configs.getConfig(filename);
            
            expect(config.language).to.equal(JSLanguage);
            expect(config.defs).to.be.an("object");
            expect(config.defs.name).to.equal("config-array");
        });

        it("should calculate correct config when passed JS filename that matches two configs", () => {
            const filename = path.resolve(basePath, "foo.test.js");

            const config = configs.getConfig(filename);
            
            expect(config.language).to.equal(JSLanguage);
            expect(config.defs).to.be.an("object");
            expect(config.defs.name).to.equal("config-array.test");
        });

        it("should calculate correct config when passed JS filename that matches a function config", () => {
            const filename = path.resolve(basePath, "bar.test.js");

            const config = configs.getConfig(filename);
            
            expect(config.language).to.equal(JSLanguage);
            expect(config.defs).to.be.an("object");
            expect(config.defs.name).to.equal("from-context");
        });

        it("should calculate correct config when passed JS filename that matches a function config returning an array", () => {
            const filename1 = path.resolve(basePath, "baz.test.js");
            const config1 = configs.getConfig(filename1);
            
            expect(config1.language).to.equal(JSLanguage);
            expect(config1.defs).to.be.an("object");
            expect(config1.defs.name).to.equal("baz-from-context");

            const filename2 = path.resolve(basePath, "baz.test.js");
            const config2 = configs.getConfig(filename2);
            
            expect(config2.language).to.equal(JSLanguage);
            expect(config2.defs).to.be.an("object");
            expect(config2.defs.name).to.equal("baz-from-context");
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
