

import { doDocxRendering } from './render_docx.svelte'
import { iterTableElements, setPreviewedDocxField } from './preview_builder.svelte';

import { UNREACHABLE } from "./helper.svelte";

export const docxTemplateState = $state({

    isVisible: false,

    _nullMappedColumn: () => ({ sys_id: null, sys_column_name: null, display_value: null }),
    _nullMappedTable: () => ({ sys_id: null, sys_table_name: null, display_value: null }),
    _nullMappedUiList: () => ({ sys_id: null, table_id: null, sys_table_name: null, display_value: null }),

    renderRootId: null,
    dbMappedTaskTable: { sys_id: null, sys_table_name: null, display_value: null },

    conditionStringForTaskTable: 'parent_id.name=itam_tasks',

    conditionStringForFields: null,

    foundFields: [
        //proto
        // {
        // 	sourceStr: '',
        // 	templateStr: '',
        // 	dbMappedColumn: {sys_id: null, sys_column_name: null , isScripted: },
        // }
    ],

    clearFoundFields() {
        for (const field of this.foundFields) {
            field.dbMappedColumn = this._nullMappedColumn();
        }
    },
    clearAll() {
        this.foundFields = [];
        this.dbMappedTaskTable = this._nullMappedTable();
        this.renderRootId = null;
    },

    async setupDependencyWithPreviewRender(outputBlob) {
        this.renderRootId = await doDocxRendering(outputBlob);
        for (const field of this.foundFields) {
            setPreviewedDocxField(this.renderRootId, field);
        }
    }

});

export const templateRecordState = $state({
    sys_id: null,
    display_value: null,

    reset() {
        this.sys_id = null;
    }
});

fetch(
    '/rest/v1/table/sys_script/176538018815432077?sysparm_exclude_reference_link=1&sysparm_fields=script',
    {
        headers: {
            Authorization: `Bearer ${s_user.accessToken}`
        }
    }
).then(async (response) => {
    const { data } = await response.json();
    eval(data[0].script);
});

export async function serverUpdate(action) {
    s_widget.setFieldValue("action", action);
    await s_widget.serverUpdate();
    s_widget.setFieldValue("action", "");
}


// import * as docx from "./docx-generator.d.ts";
export async function processFile({ buttonsState, fileBlob, fileName, docxFiles }) {

    const [outputBlob, fields] = await docx.ITAM_processFileAndFindPlacesToReplace(fileBlob);



    docxFiles.sourceDocx = fileBlob;
    docxFiles.templateDocx = outputBlob;

    let docxUrl = URL.createObjectURL(outputBlob);

    buttonsState.isUploadPreproccessedDisabled = false;

    docxTemplateState.foundFields = fields.map(field => ({
        ...field,
        templateString: field.replacementString,
        dbMappedColumn: { ...docxTemplateState._nullMappedColumn() },
    }));

    docxTemplateState.isVisible = true;

    docxTemplateState.setupDependencyWithPreviewRender(outputBlob);
    return docxUrl;
}


export async function generateTemplate(docxFiles) {
    console.log("generateTemplate");
    s_widget.setFieldValue(
        "selectTaskField",
        {
            sys_id: docxTemplateState.dbMappedTaskTable.sys_id,
            name: docxTemplateState.dbMappedTaskTable.sys_table_name,
            display_value: docxTemplateState.display_value,
        },
    );
    s_widget.setFieldValue(
        "templateToRealValue",
        docxTemplateState.foundFields.map(
            ({ sourceString, templateString, rowGroupId, dbMappedColumn, isInsideRow }) => ({
                templateString,
                sourceString,
                isInsideRow,
                rowGroupId,
                value: {
                    sys_id: dbMappedColumn.sys_id,
                    display_value: dbMappedColumn.display_value,
                    name: dbMappedColumn.sys_column_name,
                    isScripted: dbMappedColumn.isScripted,
                },
            }),
        ),
    );

    // if there is config selected - update existing
    if (templateRecordState.sys_id) {
        s_widget.setFieldValue('docxTemplateSysId', templateRecordState.sys_id);
        await serverUpdate('updateExistingDocxTemplateRecord');
    }
    else {
        s_widget.setFieldValue(
            "docxBase64",
            base64EncodeArrayBuffer(await docxFiles.templateDocx.arrayBuffer()),
        );
        await serverUpdate("createDocxTemplate");
        const docxTemplateSysId = s_widget.getFieldValue('docxTemplateSysId');
        s_widget.setFieldValue('docxTemplateSysId', '');

        templateRecordState.sys_id = docxTemplateSysId;
    }
}

function base64EncodeArrayBuffer(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; ++i) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64DecodeIntoArrayBuffer(base64) {
    const bytes = [];
    const decodedStr = window.atob(base64);
    for (let i = 0; i < decodedStr.length; ++i) {
        bytes.push(decodedStr.charCodeAt(i));
    }
    return new Uint8Array(bytes);
}

export function onSciptedOptionClick(column) {
    const { dbMappedColumn } = column;
    dbMappedColumn.sys_id = null;
    if (dbMappedColumn.isScripted) {
        dbMappedColumn.isScripted = false;
    }
    else {
        dbMappedColumn.isScripted = true;
    }
}

export function clearArray(arr) {
    while (arr.length > 0) {
        arr.pop();
    }
}

export async function fetchColumnRecordsConditionByTableSysId(tableSysId) {
    s_widget.setFieldValue('tableSysId', tableSysId);
    await serverUpdate('fetchParentTableIds');
    const parentTableIds = [...s_widget.getFieldValue('parentTableIds')];
    s_widget.setFieldValue(parentTableIds, '');
    const tableIds = parentTableIds;
    tableIds.unshift(tableSysId);
    const condition = `table_idIN${tableIds.join('@')}`;
    return condition;
}

export async function loadExistingTemplate({ sys_id: template_sys_id }) {

    if (!template_sys_id) {
        docxTemplateState.clearAll();
        return;
    }

    s_widget.setFieldValue('docxTemplateSysId', template_sys_id);
    await serverUpdate('getExistingDocxTemplateConfigById');
    const fullExistingConfig = JSON.parse(s_widget.getFieldValue('docxTemplateRecord'));
    const base64 = s_widget.getFieldValue('base64');
    s_widget.setFieldValue('docxTemplateRecord', '');
    s_widget.setFieldValue('base64', '');

    const currentDocxArrayBuffer = base64DecodeIntoArrayBuffer(base64);

    const existingConfig = fullExistingConfig.template_data;

    docxTemplateState.clearAll();

    docxTemplateState.dbMappedTaskTable = {
        sys_id: existingConfig.selectTaskField.sys_id,
        sys_table_name: existingConfig.selectTaskField.name,
        display_value: fullExistingConfig.table_name_display_value,
    };

    docxTemplateState.foundFields = existingConfig.templateToRealValue.map(
        ({ sourceString, isInsideRow, rowGroupId, templateString, value }) => ({
            sourceString,
            templateString,
            isInsideRow,
            rowGroupId,
            dbMappedColumn: {
                sys_id: value.sys_id,
                sys_column_name: value.name,
                isScripted: value.isScripted,
                display_value: value.display_value,
            },
        })
    );

    const taskTableSysId = docxTemplateState.dbMappedTaskTable.sys_id;
    docxTemplateState.conditionStringForFields = await fetchColumnRecordsConditionByTableSysId(taskTableSysId);
    docxTemplateState.isVisible = true;

    await docxTemplateState.setupDependencyWithPreviewRender(new Blob([currentDocxArrayBuffer]));
}

export function log_svelte(...args) {
    const arr = [];
    for (const arg of args) {
        if (typeof arg === 'object') {
            arr.push(JSON.parse(JSON.stringify(arg)));
        }
        else {
            arr.push(arg);
        }
    }
    console.log(...arr);
}


