"use strict";
var utf8 = require("./utf8");
var utils = require("./utils");
var GenericWorker = require("./stream/GenericWorker");
var StreamHelper = require("./stream/StreamHelper");
var defaults = require("./defaults");
var CompressedObject = require("./compressedObject");
var ZipObject = require("./zipObject");
var generate = require("./generate");
var nodejsUtils = require("./nodejsUtils");
var NodejsStreamInputAdapter = require("./nodejs/NodejsStreamInputAdapter");
var pako = require("pako");

var signature = require("./signature");

var crc32 = require("./crc32");

var base64 = require("./base64");

/**
 * Add a file in the current folder.
 * @private
 * @param {string} name the name of the file
 * @param {String|ArrayBuffer|Uint8Array|Buffer} data the data of the file
 * @param {Object} originalOptions the options of the file
 * @return {Object} the new file.
 */
var fileAdd = function (name, data, originalOptions) {
    // be sure sub folders exist
    var dataType = utils.getTypeOf(data),
        parent;


    /*
     * Correct options.
     */

    var o = utils.extend(originalOptions || {}, defaults);
    o.date = o.date || new Date();
    if (o.compression !== null) {
        o.compression = o.compression.toUpperCase();
    }

    if (typeof o.unixPermissions === "string") {
        o.unixPermissions = parseInt(o.unixPermissions, 8);
    }

    // UNX_IFDIR  0040000 see zipinfo.c
    if (o.unixPermissions && (o.unixPermissions & 0x4000)) {
        o.dir = true;
    }
    // Bit 4    Directory
    if (o.dosPermissions && (o.dosPermissions & 0x0010)) {
        o.dir = true;
    }

    if (o.dir) {
        name = forceTrailingSlash(name);
    }
    if (o.createFolders && (parent = parentFolder(name))) {
        folderAdd.call(this, parent, true);
    }

    var isUnicodeString = dataType === "string" && o.binary === false && o.base64 === false;
    if (!originalOptions || typeof originalOptions.binary === "undefined") {
        o.binary = !isUnicodeString;
    }


    var isCompressedEmpty = (data instanceof CompressedObject) && data.uncompressedSize === 0;

    if (isCompressedEmpty || o.dir || !data || data.length === 0) {
        o.base64 = false;
        o.binary = true;
        data = "";
        o.compression = "STORE";
        dataType = "string";
    }

    /*
     * Convert content to fit.
     */

    var zipObjectContent = null;
    if (data instanceof CompressedObject || data instanceof GenericWorker) {
        zipObjectContent = data;
    } else if (nodejsUtils.isNode && nodejsUtils.isStream(data)) {
        zipObjectContent = new NodejsStreamInputAdapter(name, data);
    } else {
        zipObjectContent = utils.prepareContent(name, data, o.binary, o.optimizedBinaryString, o.base64);
    }

    var object = new ZipObject(name, zipObjectContent, o);
    this.files[name] = object;
    /*
    TODO: we can't throw an exception because we have async promises
    (we can have a promise of a Date() for example) but returning a
    promise is useless because file(name, data) returns the JSZip
    object for chaining. Should we break that to allow the user
    to catch the error ?

    return external.Promise.resolve(zipObjectContent)
    .then(function () {
        return object;
    });
    */
};

/**
 * Find the parent folder of the path.
 * @private
 * @param {string} path the path to use
 * @return {string} the parent folder, or ""
 */
var parentFolder = function (path) {
    if (path.slice(-1) === "/") {
        path = path.substring(0, path.length - 1);
    }
    var lastSlash = path.lastIndexOf("/");
    return (lastSlash > 0) ? path.substring(0, lastSlash) : "";
};

/**
 * Returns the path with a slash at the end.
 * @private
 * @param {String} path the path to check.
 * @return {String} the path with a trailing slash.
 */
var forceTrailingSlash = function (path) {
    // Check the name ends with a /
    if (path.slice(-1) !== "/") {
        path += "/"; // IE doesn't like substr(-1)
    }
    return path;
};

/**
 * Add a (sub) folder in the current folder.
 * @private
 * @param {string} name the folder's name
 * @param {boolean=} [createFolders] If true, automatically create sub
 *  folders. Defaults to false.
 * @return {Object} the new folder.
 */
var folderAdd = function (name, createFolders) {
    createFolders = (typeof createFolders !== "undefined") ? createFolders : defaults.createFolders;

    name = forceTrailingSlash(name);

    // Does this folder already exist?
    if (!this.files[name]) {
        fileAdd.call(this, name, null, {
            dir: true,
            createFolders: createFolders
        });
    }
    return this.files[name];
};

/**
* Cross-window, cross-Node-context regular expression detection
* @param  {Object}  object Anything
* @return {Boolean}        true if the object is a regular expression,
* false otherwise
*/
function isRegExp(object) {
    return Object.prototype.toString.call(object) === "[object RegExp]";
}

// return the actual prototype of JSZip
var out = {
    /**
     * @see loadAsync
     */
    load: function () {
        throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
    },


    /**
     * Call a callback function for each entry at this folder level.
     * @param {Function} cb the callback function:
     * function (relativePath, file) {...}
     * It takes 2 arguments : the relative path and the file.
     */
    forEach: function (cb) {
        var filename, relativePath, file;
        // ignore warning about unwanted properties because this.files is a null prototype object
        /* eslint-disable-next-line guard-for-in */
        for (filename in this.files) {
            file = this.files[filename];
            relativePath = filename.slice(this.root.length, filename.length);
            if (relativePath && filename.slice(0, this.root.length) === this.root) { // the file is in the current root
                cb(relativePath, file); // TODO reverse the parameters ? need to be clean AND consistent with the filter search fn...
            }
        }
    },

    /**
     * Filter nested files/folders with the specified function.
     * @param {Function} search the predicate to use :
     * function (relativePath, file) {...}
     * It takes 2 arguments : the relative path and the file.
     * @return {Array} An array of matching elements.
     */
    filter: function (search) {
        var result = [];
        this.forEach(function (relativePath, entry) {
            if (search(relativePath, entry)) { // the file matches the function
                result.push(entry);
            }

        });
        return result;
    },

    /**
     * Add a file to the zip file, or search a file.
     * @param   {string|RegExp} name The name of the file to add (if data is defined),
     * the name of the file to find (if no data) or a regex to match files.
     * @param   {String|ArrayBuffer|Uint8Array|Buffer} data  The file data, either raw or base64 encoded
     * @param   {Object} o     File options
     * @return  {JSZip|Object|Array} this JSZip object (when adding a file),
     * a file (when searching by string) or an array of files (when searching by regex).
     */
    file: function (name, data, o) {
        if (arguments.length === 1) {
            if (isRegExp(name)) {
                var regexp = name;
                return this.filter(function (relativePath, file) {
                    return !file.dir && regexp.test(relativePath);
                });
            }
            else { // text
                var obj = this.files[this.root + name];
                if (obj && !obj.dir) {
                    return obj;
                } else {
                    return null;
                }
            }
        }
        else { // more than one argument : we have data !
            name = this.root + name;
            fileAdd.call(this, name, data, o);
        }
        return this;
    },

    /**
     * Add a directory to the zip file, or search.
     * @param   {String|RegExp} arg The name of the directory to add, or a regex to search folders.
     * @return  {JSZip} an object with the new directory as the root, or an array containing matching folders.
     */
    folder: function (arg) {
        if (!arg) {
            return this;
        }

        if (isRegExp(arg)) {
            return this.filter(function (relativePath, file) {
                return file.dir && arg.test(relativePath);
            });
        }

        // else, name is a new folder
        var name = this.root + arg;
        var newFolder = folderAdd.call(this, name);

        // Allow chaining by returning a new object with this folder as the root
        var ret = this.clone();
        ret.root = newFolder.name;
        return ret;
    },

    /**
     * Delete a file, or a directory and all sub-files, from the zip
     * @param {string} name the name of the file to delete
     * @return {JSZip} this JSZip object
     */
    remove: function (name) {
        name = this.root + name;
        var file = this.files[name];
        if (!file) {
            // Look for any folders
            if (name.slice(-1) !== "/") {
                name += "/";
            }
            file = this.files[name];
        }

        if (file && !file.dir) {
            // file
            delete this.files[name];
        } else {
            // maybe a folder, delete recursively
            var kids = this.filter(function (relativePath, file) {
                return file.name.slice(0, name.length) === name;
            });
            for (var i = 0; i < kids.length; i++) {
                delete this.files[kids[i].name];
            }
        }

        return this;
    },

    /**
     * @deprecated This method has been removed in JSZip 3.0, please check the upgrade guide.
     */
    generate: function () {
        throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
    },

    /**
     * Generate the complete zip file as an internal stream.
     * @param {Object} options the options to generate the zip file :
     * - compression, "STORE" by default.
     * - type, "base64" by default. Values are : string, base64, uint8array, arraybuffer, blob.
     * @return {StreamHelper} the streamed zip file.
     */
    generateInternalStream: function (options) {
        var worker, opts = {};
        try {
            opts = utils.extend(options || {}, {
                streamFiles: false,
                compression: "STORE",
                compressionOptions: null,
                type: "",
                platform: "DOS",
                comment: null,
                mimeType: "application/zip",
                encodeFileName: utf8.utf8encode
            });

            opts.type = opts.type.toLowerCase();
            opts.compression = opts.compression.toUpperCase();

            // "binarystring" is preferred but the internals use "string".
            if (opts.type === "binarystring") {
                opts.type = "string";
            }

            if (!opts.type) {
                throw new Error("No output type specified.");
            }

            utils.checkSupport(opts.type);

            // accept nodejs `process.platform`
            if (
                opts.platform === "darwin" ||
                opts.platform === "freebsd" ||
                opts.platform === "linux" ||
                opts.platform === "sunos"
            ) {
                opts.platform = "UNIX";
            }
            if (opts.platform === "win32") {
                opts.platform = "DOS";
            }

            var comment = opts.comment || this.comment || "";
            worker = generate.generateWorker(this, opts, comment);
        } catch (e) {
            worker = new GenericWorker("error");
            worker.error(e);
        }
        return new StreamHelper(worker, opts.type || "string", opts.mimeType);
    },
    /**
     * Generate the complete zip file asynchronously.
     * @see generateInternalStream
     */
    generateAsync: async function (options, onUpdate) {
        const stream = this.generateInternalStream(options);
        return await stream.accumulate(onUpdate);
    },
    /**
     * Generate the complete zip file asynchronously.
     * @see generateInternalStream
     */
    generateNodeStream: function (options, onUpdate) {
        options = options || {};
        if (!options.type) {
            options.type = "nodebuffer";
        }
        return this.generateInternalStream(options).toNodejsStream(onUpdate);
    },
    generateSync: function (options, onUpdate) {
        var opts = utils.extend(options || {}, {
            streamFiles: false,
            compression: "STORE",
            compressionOptions: null,
            type: "",
            platform: "DOS",
            comment: null,
            mimeType: "application/zip",
            encodeFileName: utf8.utf8encode
        });

        opts.type = (opts.type || "").toLowerCase();
        opts.compression = (opts.compression || "STORE").toUpperCase();

        if (opts.type === "binarystring") {
            opts.type = "string";
        }
        if (!opts.type) {
            throw new Error("No output type specified.");
        }
        utils.checkSupport(opts.type);

        if (
            opts.platform === "darwin" ||
            opts.platform === "freebsd" ||
            opts.platform === "linux" ||
            opts.platform === "sunos"
        ) {
            opts.platform = "UNIX";
        }
        if (opts.platform === "win32") {
            opts.platform = "DOS";
        }

        var zipComment = opts.comment || this.comment || "";


        function decToHex(dec, bytes) {
            var hex = "", i;
            for (i = 0; i < bytes; i++) {
                hex += String.fromCharCode(dec & 0xff);
                dec = dec >>> 8;
            }
            return hex;
        }

        function generateCentralDirectoryEnd(entriesCount, centralDirLength, localDirLength, comment, encodeFileName) {
            var encodedComment = utils.transformTo("string", encodeFileName(comment || ""));
            return signature.CENTRAL_DIRECTORY_END +
                "\x00\x00" +
                "\x00\x00" +
                decToHex(entriesCount, 2) +
                decToHex(entriesCount, 2) +
                decToHex(centralDirLength, 4) +
                decToHex(localDirLength, 4) +
                decToHex(encodedComment.length, 2) +
                encodedComment;
        }

        function transformZipOutput(type, content, mimeType) {
            switch (type) {
                case "blob":
                    return utils.newBlob(utils.transformTo("arraybuffer", content), mimeType);
                case "base64":
                    return base64.encode(content);
                default:
                    return utils.transformTo(type, content);
            }
        }

        function toBinaryString(data) {
            if (data === undefined || data === null) {
                return "";
            }
            if (typeof data === "string") {
                return data;
            }
            return utils.transformTo("string", data);
        }

        function getCompressionName(file) {
            return (file.options && file.options.compression) || opts.compression;
        }

        // raw (uncompressed) bytes as Uint8Array
        function getUncompressedU8(file) {
            if (file.dir) {
                return new Uint8Array(0);
            }

            // Если это CompressedObject — распаковываем аккуратно по magic
            if (typeof CompressedObject !== "undefined" && file._data instanceof CompressedObject) {
                var magic = file._data.compression && file._data.compression.magic;
                var cc = file._data.compressedContent;

                // STORE: данные уже “как есть”
                if (magic === "\x00\x00") {
                    return utils.transformTo("uint8array", cc);
                }

                // DEFLATE: raw inflate
                // (в вашей сборке ZipObject.sync делает inflateRaw всегда,
                //  но тут сделаем безопаснее)
                if (magic === "\x08\x00") {
                    var inflated = pako.inflateRaw(cc, { raw: true });
                    return utils.transformTo("uint8array", inflated);
                }

                // неизвестное magic — без стримов не разрулить корректно
                throw new Error("generateSync: unsupported CompressedObject compression magic: " + utils.pretty(magic || ""));
            }

            // иначе _data — исходный контент
            var d = file._data;

            if (typeof d === "string") {
                // если строка не бинарная — кодируем в UTF-8 байты
                if (!file._dataBinary) {
                    return utils.transformTo("uint8array", utf8.utf8encode(d));
                }
                // бинарная строка
                return utils.transformTo("uint8array", d);
            }

            return utils.transformTo("uint8array", d);
        }

        function compressU8(u8, compressionName, compressionOptions) {
            if (!u8 || u8.length === 0) {
                return new Uint8Array(0);
            }

            compressionName = (compressionName || "STORE").toUpperCase();

            if (compressionName === "STORE") {
                return u8;
            }

            if (compressionName === "DEFLATE") {
                var level = (compressionOptions && typeof compressionOptions.level === "number")
                    ? compressionOptions.level
                    : -1;

                var res = pako.deflateRaw(u8, { raw: true, level: level });
                return utils.transformTo("uint8array", res);
            }

            throw new Error("generateSync: unsupported compression for sync mode: " + compressionName);
        }

        // --- сборка ---
        var parts = [];
        var dirRecords = [];
        var bytesWritten = 0;

        var entriesCount = 0;
        this.forEach(function () { entriesCount++; });

        var processed = 0;

        this.forEach(function (relativePath, file) {
            processed++;

            var dir = !!file.dir;
            var date = file.date || new Date();

            var compressionName = getCompressionName(file);
            var compression = generate.getCompression(file.options && file.options.compression, opts.compression);
            var compressionOptions = (file.options && file.options.compressionOptions) || opts.compressionOptions || {};

            // 1) uncompressed bytes
            var uncompressedU8 = getUncompressedU8(file);

            // 2) crc32 по binary-string представлению байт
            var uncompressedBinStr = toBinaryString(uncompressedU8);
            var uncompressedSize = dir ? 0 : uncompressedU8.length;
            var fileCrc32 = dir ? 0 : crc32(uncompressedBinStr);

            // 3) compress
            var compressedU8 = dir ? new Uint8Array(0) : compressU8(uncompressedU8, compressionName, compressionOptions);
            var compressedBinStr = toBinaryString(compressedU8);
            var compressedSize = dir ? 0 : compressedU8.length;

            // 4) headers через generateZipParts
            var streamInfo = {
                file: {
                    name: relativePath,
                    dir: dir,
                    date: date,
                    comment: (file.comment || ""),
                    unixPermissions: file.unixPermissions,
                    dosPermissions: file.dosPermissions
                },
                compression: compression,
                crc32: fileCrc32,
                compressedSize: compressedSize,
                uncompressedSize: uncompressedSize
            };

            var record = generate.generateZipParts(
                streamInfo,
                false,
                true,
                bytesWritten,
                opts.platform,
                opts.encodeFileName
            );

            parts.push(record.fileRecord);
            bytesWritten += record.fileRecord.length;

            if (!dir) {
                parts.push(compressedBinStr);
                bytesWritten += compressedBinStr.length;
            }

            dirRecords.push(record.dirRecord);

            if (typeof onUpdate === "function") {
                onUpdate({
                    currentFile: relativePath,
                    percent: entriesCount ? (processed * 100) / entriesCount : 100
                });
            }
        }.bind(this));

        // central directory
        var localDirLength = bytesWritten;

        for (var i = 0; i < dirRecords.length; i++) {
            parts.push(dirRecords[i]);
            bytesWritten += dirRecords[i].length;
        }

        var centralDirLength = bytesWritten - localDirLength;
        parts.push(generateCentralDirectoryEnd(dirRecords.length, centralDirLength, localDirLength, zipComment, opts.encodeFileName));

        var finalBinaryString = parts.join("");
        return transformZipOutput(opts.type, finalBinaryString, opts.mimeType);
    },


};
module.exports = out;
