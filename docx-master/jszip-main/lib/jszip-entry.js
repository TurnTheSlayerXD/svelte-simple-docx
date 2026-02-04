// Берём CommonJS entry
const JSZip = require("./index.js");

// Делаем ESM-friendly default export
module.exports = JSZip;
module.exports.default = JSZip;
module.exports.__esModule = true;