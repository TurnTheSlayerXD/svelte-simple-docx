/* eslint-disable */
require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');

const { log } = console;

const pathFile = process.argv[2];

disableCertificateVerification();

const URI = process.env.INSTANCE_URI;
const user = process.env.LOGIN_USERNAME;
const password = process.env.LOGIN_PASSWORD;

const sys_id = process.env.WIDGET_ID;

new Promise((resolve) => resolve(true))
    .then(_ => sendRequest({
        tableName: 'sys_widget',
        id: sys_id,
    },
        {
            client_script: fs.readFileSync('./dist-webpack/bundle.js').toString(),
            // server_script: fs.readFileSync('./src/svelte_constructor/server.js').toString(),
            // css: fs.readFileSync('./src/svelte_constructor/css.css').toString(),
            // template: fs.readFileSync('./src/svelte_constructor/template.html').toString(),
        },
    ))
    // .then(() => sendRequest({
    //     tableName: 'sys_ui_action',
    //     id: '176587443012697588',
    // }, { script: fs.readFileSync('./src/template_generator/ui_action.js').toString(), },))
    // .then(() => sendRequest({
        // tableName: 'sys_widget',
        // id: '176613180512408342'
    // }, {
        // server_script: fs.readFileSync('./src/template_generator/server.js').toString(),
        // client_script: fs.readFileSync('./src/template_generator/client.js').toString(),
        // css: fs.readFileSync('./src/template_generator/css.css').toString(),
        // template: fs.readFileSync('./src/template_generator/template.html').toString(),
    // }))
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
