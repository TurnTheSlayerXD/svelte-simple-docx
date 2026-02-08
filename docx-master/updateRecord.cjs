/* eslint-disable */
require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');
const { isNumberObject } = require('node:util/types');

const { log } = console;

const pathFile = process.argv[2];

disableCertificateVerification();

const URI = process.env.INSTANCE_URI;
const user = process.env.LOGIN_USERNAME;
const password = process.env.LOGIN_PASSWORD;


let src = fs.readFileSync("./dist/index.umd.cjs").toString();

let index = src.indexOf("runTimeout(drainQueue);") - 1;

while (src[index] === ' ') {
    --index;
}

if (src[index] !== "/" || src[index - 1] !== "/") {
    console.log("replaced runTimeout(drainQueue); with //runTimeout(drainQueue);")
    src = src.replace("runTimeout(drainQueue);", "//runTimeout(drainQueue);");
    fs.writeFileSync("./dist/index.umd.cjs", src);
} else {

    console.log("already //runTimeout(drainQueue);");
}


new Promise((resolve) => resolve(true))
    .then(_ => sendRequest({
        tableName: 'sys_script',
        id: "177011630314367486",
    },
        {
            script: src,
            // css: fs.readFileSync('./src/svelte_constructor/css.css').toString(),
            // template: fs.readFileSync('./src/svelte_constructor/template.html').toString(),
        },
    ))
    .then(c => {
        console.log('status', c.status)
    }).catch(c => {
        console.error(c);
    });

function disableCertificateVerification() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

async function sendRequest(recordData, recordContent) {
    if (!recordData.tableName) {
        return true;
    }
    disableCertificateVerification();
    const url = `${URI}/rest/v1/table/${recordData.tableName}/${recordData.id}`;

    return fetch(url, {
        method: 'PATCH',
        headers: {
            Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`,
            'Content-Type': 'application/json',
            //'X-Elevated-Roles': 'vendor',
        },
        body: JSON.stringify(recordContent),
    });
}


