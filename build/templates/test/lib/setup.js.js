"use strict";
const createAdapter_1 = require("../../../src/lib/createAdapter");
module.exports = (answers => {
    return createAdapter_1.readFile("setup.raw.js", __dirname);
});
