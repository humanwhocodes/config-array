/**
 * @fileoverview Nitpik configuration file
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

const { JavaScriptFormatter } = require('@nitpik/javascript');

//-----------------------------------------------------------------------------
// Config
//-----------------------------------------------------------------------------

module.exports = {
	files: ['**/*.js'],
	formatter: new JavaScriptFormatter({
		style: {
			quotes: 'single',
			indent: '\t'
		}
	})
};
