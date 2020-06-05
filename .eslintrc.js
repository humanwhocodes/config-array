/*global module:true*/
module.exports = {
    "env": {
        "es6": true,
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 2020,
        "sourceType": "module"
    },
    "rules": {
        "semi": [
            "error",
            "always"
        ]
    },
    overrides: [
        {
            files: ["tests/*.js"],
            env: {
                mocha: true,
                node: true
            }
        },
        {
            files: ["*.config.js"],
            parserOptions: {
                sourceType: "script",
            },
            env: {
                node: true
            }
        }
    ]
};
