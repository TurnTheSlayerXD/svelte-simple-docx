

import { findPlacesInDocxToReplace } from './docx_replacement_detector.svelte';

import { doDocxRendering } from './render_docx.svelte'
import { setColorForPreviewedDocxField } from './preview_builder.svelte';

export const docxTemplateState = $state({

    isVisible: false,

    _nullMappedColumn: () => ({ sys_id: null, sys_column_name: null, display_value: null }),
    _nullMappedTable: () => ({ sys_id: null, sys_table_name: null, display_value: null }),
    _nullMappedUiList: () => ({ sys_id: null, table_id: null, sys_table_name: null, display_value: null }),

    dbMappedTaskTable: { sys_id: null, sys_table_name: null, display_value: null },

    conditionStringForTaskTable: 'parent_id.name=itam_tasks',

    conditionStringForFields: null,
    conditionStringForRelatedLists: null,

    foundFields: [
        //proto
        // {
        // 	sourceStr: '',
        // 	templateStr: '',
        // 	dbMappedColumn: {sys_id: null, sys_column_name: null , isScripted: },
        // }
    ],
    foundTables: [
        //proto
        // 	{
        // 		formedTitleStr: '',
        // 		dbMappedUiList: { sys_id: null, table_id: null, sys_table_name: null },
        // 		
        //		conditionStringForColumns: null,
        // 		foundColumns: [
        // 			{
        // 				sourceStr: 'кол-во',
        // 				dbMappedColumn: { sys_id: null,
        //                                       sys_column_name: null,
        //                                       isEnumerated: ,
        //                                       isScripted: }

        // 			}
        // 		],
        // 	}
    ],
    clearFoundFields() {
        for (const field of this.foundFields) {
            field.dbMappedColumn = this._nullMappedColumn();
        }
    },
    clearFoundTables() {
        for (const foundTable of this.foundTables) {
            foundTable.dbMappedUiList = this._nullMappedUiList();
            for (const foundColumn of foundTable.foundColumns) {
                foundColumn.dbMappedColumn = this._nullMappedColumn();
            }
        }
    },
    clearAll() {
        this.foundFields = [];
        this.foundTables = [];
        this.dbMappedTaskTable = this._nullMappedTable();
    }

});

export const templateRecordState = $state({
    sys_id: null,
    display_value: null,
});

serverUpdate("fetchDocxScript").then(() => {
    eval(s_widget.getFieldValue("docxLibraryScript"));
    s_widget.setFieldValue("docxLibraryScript", "");
});

export async function serverUpdate(action) {
    s_widget.setFieldValue("action", action);
    await s_widget.serverUpdate();
    s_widget.setFieldValue("action", "");
}


// import * as docx from "../../../../dev_scripts";
export async function processFile({ buttonsState, fileBlob, fileName, docxFiles }) {

    const { outputBlob, fields, tables } = await findPlacesInDocxToReplace(fileBlob);


    docxFiles.sourceDocx = fileBlob;
    docxFiles.templateDocx = outputBlob;

    let docxUrl = URL.createObjectURL(outputBlob);

    buttonsState.isUploadPreproccessedDisabled = false;

    docxTemplateState.foundFields = fields.map(field => ({
        ...field,
        dbMappedColumn: { ...docxTemplateState._nullMappedColumn() },
    }));

    docxTemplateState.foundTables = tables.map(table => ({
        formedTitleStr: table.formedTitleStr,
        tableOrderIndex: table.tableOrderIndex,

        conditionStringForColumns: '',
        dbMappedUiList: { ...docxTemplateState._nullMappedUiList() },
        foundColumns: table.foundColumns.map(col => (
            {
                sourceStr: col,
                dbMappedColumn: { ...docxTemplateState._nullMappedColumn() },
            })),
    }));

    docxTemplateState.isVisible = true;

    docxTemplateState.renderRootId = await doDocxRendering(outputBlob);

    return docxUrl;
}


export async function generateTemplate(buttonsState, docxFiles) {
    buttonsState.isUploadPreproccessedDisabled = true;
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
            ({ sourceStr, templateStr, dbMappedColumn }) => ({
                template: templateStr,
                originalValue: sourceStr,
                value: {
                    sys_id: dbMappedColumn.sys_id,
                    display_value: dbMappedColumn.display_value,
                    name: dbMappedColumn.sys_column_name,
                    isScripted: dbMappedColumn.isScripted,
                },
            }),
        ),
    );
    s_widget.setFieldValue(
        "detectedTables",
        docxTemplateState.foundTables.map(
            ({ dbMappedUiList, tableOrderIndex, formedTitleStr, foundColumns }) => ({
                value: {
                    display_value: dbMappedUiList.display_value,
                    sys_id: dbMappedUiList.table_id,
                    name: dbMappedUiList.sys_table_name,
                    related_list_sys_id: dbMappedUiList.sys_id,
                },
                title: formedTitleStr,
                tableOrderIndex,

                columns: foundColumns.map(
                    ({ sourceStr, dbMappedColumn }) => ({

                        template: sourceStr,
                        value: {
                            sys_id: dbMappedColumn.sys_id,
                            name: dbMappedColumn.sys_column_name,
                            display_value: dbMappedColumn.display_value,
                            isEnumerationColumn: dbMappedColumn.isEnumerated,
                            isScripted: dbMappedColumn.isScripted,
                        },
                    })),
            })),
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

        buttonsState.isUploadPreproccessedDisabled = false;
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

export function onEnumerationOptionClick(column) {
    const { dbMappedColumn } = column;
    dbMappedColumn.sys_id = null;
    if (dbMappedColumn.isEnumerated) {
        dbMappedColumn.isEnumerated = false;
    }
    else {
        dbMappedColumn.isEnumerated = true;
        dbMappedColumn.isScripted = false;
    }
}

export function onSciptedOptionClick(column) {
    const { dbMappedColumn } = column;
    dbMappedColumn.sys_id = null;
    if (dbMappedColumn.isScripted) {
        dbMappedColumn.isScripted = false;
    }
    else {
        dbMappedColumn.isScripted = true;
        dbMappedColumn.isEnumerated = false;
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

export async function fetchRelatedListsConditionByTableSysId(tableSysId) {
    // s_widget.setFieldValue('tableSysId', tableSysId);
    // await serverUpdate('fetchParentTableIds');
    // const parentTableIds = [...s_widget.getFieldValue('parentTableIds')];
    // s_widget.setFieldValue(parentTableIds, '');
    // const tableIds = parentTableIds;
    // tableIds.unshift(tableSysId);
    const condition = `related_list_id.table_id=${tableSysId}`;
    return condition;
}



export async function loadExistingTemplate({ sys_id: template_sys_id }) {

    if (!template_sys_id) {
        templateRecordState.previous_sys_id = template_sys_id;
        docxTemplateState.clearAll();
        return;
    }
    if (template_sys_id === templateRecordState.previous_sys_id) {
        console.log('ignoring loadExistingTemplate');
        return;
    }
    templateRecordState.previous_sys_id = template_sys_id;


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
        ({ template, originalValue, value }) => ({
            sourceStr: originalValue,
            templateStr: template,
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
    docxTemplateState.conditionStringForRelatedLists = await fetchRelatedListsConditionByTableSysId(taskTableSysId);

    docxTemplateState.foundTables = await Promise.all(existingConfig.detectedTables.map(
        async ({ title, value, columns }) => ({

            formedTitleStr: title,

            dbMappedUiList: { sys_id: value.related_list_sys_id, table_id: value.sys_id, sys_table_name: value.name, display_value: value.display_value },

            conditionStringForColumns: value.sys_id ? await fetchColumnRecordsConditionByTableSysId(value.sys_id) : null,

            foundColumns: columns.map(
                ({ value, template }) => (
                    {
                        sourceStr: template,
                        dbMappedColumn: {
                            sys_id: value.sys_id,
                            sys_column_name: value.name,
                            display_value: value.display_value,
                            isEnumerated: value.isEnumerationColumn,
                            isScripted: value.isScripted,
                        }
                    }),
            ),
        }))
    );

    docxTemplateState.isVisible = true;

    docxTemplateState.renderRootId = await doDocxRendering(new Blob([currentDocxArrayBuffer]));

    for (const field of docxTemplateState.foundFields) {
        setColorForPreviewedDocxField(docxTemplateState.renderRootId, field);
    }
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


