/*eslint-disable*/
if (input.action === 'createAttachmentAndReturnUrl') {
    const recordId = '176536473116070522';
    const tableId = '156698966100835946';
    const { docxFileName } = input;
    const { docxFileArrayBuffer } = input;
    const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const docId = ss.getDocIdByIds(tableId, recordId);
    const attachmentService = new SimpleAttachment();
    let binary = '';
    const bytes = new Uint8Array(docxFileArrayBuffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    const base64 = attachmentService.base64Encode(binary);
    const attachmentId = attachmentService.writeBase64(docId, docxFileName, base64, mimeType);
    data.attachmentUrl = attachmentService.getAttachmentUrlById(attachmentId);
}

else if (input.action === 'fetchDocxScript') {
    const sr = new SimpleRecord('sys_script');
    sr.get('176538018815432077');
    data.docxLibraryScript = sr.script;
}

else if (input.action === 'fetchItamTaskTypes') {
    data.tableTypes = JSON.stringify(fetchItamTaskTypes());
}

else if (input.action === "createDocxTemplate") {
    const { docxBase64, selectTaskField, templateToRealValue, detectedTables } = input;
    if (!selectTaskField.sys_id) {
        return;
    }

    const resultJSON = JSON.stringify({ selectTaskField, templateToRealValue, detectedTables });

    const docxTemplateSr = new SimpleRecord('itam_task_docx_template');
    docxTemplateSr.setValue('task_table_id', selectTaskField.sys_id);
    docxTemplateSr.setValue('template_data', resultJSON);
    const docxTemplateSysId = docxTemplateSr.insert();
    if (!docxTemplateSysId) {
        ss.addErrorMessage('Failed to save template');
        return;
    }
    const docId = ss.getDocIdByIds('176580796911236520', docxTemplateSysId);
    const attachmentService = new SimpleAttachment();
    const attachmentId = attachmentService.writeBase64(docId, 'template.docx', docxBase64, '.docx');
    if (!attachmentId) {
        ss.addErrorMessage('Failed to save base64 template');
        return;
    }
    ss.addSuccessMessage(`Succesfully saved template! into <a href="/record/itam_task_docx_template/${docxTemplateSysId}">Ref to template</a>`);
}

else if (input.action === 'getExistingDocxTemplateConfigById') {
    const { docxTemplateSysId } = input;
    const docxTemplateSr = new SimpleRecord('itam_task_docx_template');
    docxTemplateSr.get(docxTemplateSysId);

    const itam_task_docx_template_ID = '176580796911236520';
    const docxTemplateDocumentId = ss.getDocIdByIds(itam_task_docx_template_ID, docxTemplateSysId);

    const attachmentSr = new SimpleRecord('sys_attachment');
    attachmentSr.addQuery('record_document_id', docxTemplateDocumentId);
    attachmentSr.selectAttributes('sys_id');
    attachmentSr.setLimit(1);
    attachmentSr.query();
    if (!attachmentSr.next()) {
        throw new Error('failed fetching docx attachment sysId');
    }
    data.docxTemplateRecord = JSON.stringify({
        sys_id: docxTemplateSr.sys_id,
        table_id: docxTemplateSr.getValue('task_table_id'),
        template_data: JSON.parse(docxTemplateSr.template_data),
    });
    data.base64 = new SimpleAttachment().readBase64(attachmentSr.sys_id);
}

else if (input.action === 'getExistingDocxTemplateRecords') {
    const docxTemplateSr = new SimpleRecord('itam_task_docx_template');
    docxTemplateSr.selectAttributes(['sys_id', 'name']);
    docxTemplateSr.query();
    const docxTemplateRecords = [];
    while (docxTemplateSr.next()) {
        docxTemplateRecords.push({ sys_id: docxTemplateSr.sys_id, name: docxTemplateSr.name, title: docxTemplateSr.name });
    }
    data.docxTemplateRecords = JSON.stringify(docxTemplateRecords);
}

else if (input.action === 'updateExistingDocxTemplateRecord') {
    const { docxTemplateSysId, selectTaskField, templateToRealValue, detectedTables } = input;
    if (!selectTaskField.sys_id) {
        return;
    }
    const resultJSON = JSON.stringify({ selectTaskField, templateToRealValue, detectedTables });
    const docxTemplateSr = new SimpleRecord('itam_task_docx_template');
    docxTemplateSr.get(docxTemplateSysId);
    docxTemplateSr.setValue('task_table_id', selectTaskField.sys_id);
    docxTemplateSr.setValue('template_data', resultJSON);
    let resultOfUpdate = docxTemplateSr.update();
    if (!resultOfUpdate) {
        ss.addErrorMessage(`Failed to updated template <a href="/record/itam_task_docx_template/${docxTemplateSysId}">Ref to template</a>`);
        return;
    }
    ss.addSuccessMessage(`Succesfully updated template! into <a href="/record/itam_task_docx_template/${docxTemplateSysId}">Ref to template</a>`);
}



function fetchItamTaskTypes() {

    const tableSr = new SimpleRecord('sys_db_table');
    tableSr.addEncodedQuery('parent_id.name=itam_tasks^ORnameINitam_tasks@task');
    tableSr.selectAttributes(['title', 'name']);
    tableSr.query();
    const tableTypes = [];

    while (tableSr.next()) {
        tableTypes.push({
            sys_id: tableSr.sys_id,
            name: tableSr.name,
            title: tableSr.title,
            columns: [],
            scripts: [],
            relatedTables: [],
        });
    }

    const relatedListArr = [];
    const relatedListSr = new SimpleRecord('sys_ui_related_list');
    relatedListSr.addQuery('table_id', 'in', tableTypes.map(({ sys_id }) => sys_id));
    relatedListSr.selectAttributes(['table_id']);
    relatedListSr.query();
    while (relatedListSr.next()) {
        relatedListArr.push({ table_id: relatedListSr.getValue('table_id'), sys_id: relatedListSr.sys_id });
    }

    const relatedListElementSr = new SimpleRecord('sys_ui_related_list_element');
    relatedListElementSr.addQuery('related_list_id', 'in', relatedListArr.map(({ sys_id }) => sys_id));
    relatedListElementSr.selectAttributes(['title', 'related_list_id', 'related_table_id', 'related_list_script_id']);
    relatedListElementSr.query();

    const relatedTablesArr = [];

    while (relatedListElementSr.next()) {
        const { table_id } = relatedListArr.find(({ sys_id }) => sys_id === relatedListElementSr.getValue('related_list_id'));
        const table = tableTypes.find(({ sys_id }) => sys_id === table_id);

        if (relatedListElementSr.getValue('related_table_id')) {
            const relatedTableRecord = {
                sys_id: relatedListElementSr.getValue('related_table_id'),
                name: relatedListElementSr.related_table_id.name,
                title: relatedListElementSr.related_table_id.title,
                columns: [],
                scripts: [],
                related_list_name: relatedListElementSr.title,
                related_list_sys_id: relatedListElementSr.sys_id,
                related_by_column: true,
            };
            table.relatedTables.push(relatedTableRecord);
            relatedTablesArr.push(relatedTableRecord);
        } else if (relatedListElementSr.getValue('related_list_script_id')) {
            const { query_from } = relatedListElementSr.related_list_script_id;
            const relatedTableRecord = {
                sys_id: query_from.sys_id,
                name: query_from.name,
                title: query_from.title,
                columns: [],
                scripts: [],
                related_list_name: relatedListElementSr.title,
                related_list_sys_id: relatedListElementSr.sys_id,
                related_by_script: true,
            };
            table.relatedTables.push(relatedTableRecord);
            relatedTablesArr.push(relatedTableRecord);
        }
    }

    const columnSr = new SimpleRecord('sys_db_column');
    columnSr.addQuery('table_id', 'in', [...tableTypes.map(t => t.sys_id), ...relatedTablesArr.map(t => t.sys_id)]);
    columnSr.addQuery('column_name', 'not in', ['sys_id']);
    columnSr.selectAttributes(['column_name', 'title', 'table_id']);
    columnSr.query();
    while (columnSr.next()) {
        const columnRecord = { sys_id: columnSr.sys_id, title: columnSr.title, name: columnSr.column_name };
        const table = tableTypes.find(({ sys_id }) => sys_id === columnSr.getValue('table_id'));
        if (table?.name === 'task') {
            for (const tableIter of tableTypes) {
                tableIter.columns.push(columnRecord);
            }
        }
        else if (table) {
            table.columns.push(columnRecord);
        }
        relatedTablesArr.filter(({ sys_id }) => sys_id === columnSr.getValue('table_id')).forEach(relatedTable => relatedTable.columns.push(columnRecord));
    }

    const tableScriptSr = new SimpleRecord('itam_script_table_mapping');
    tableScriptSr.addQuery('table_id', 'in', [...tableTypes.map(t => t.sys_id), ...relatedTablesArr.map(t => t.sys_id)]);
    tableScriptSr.selectAttributes(['name', 'table_id']);
    tableScriptSr.query();
    while (tableScriptSr.next()) {
        const scriptRecord = { sys_id: tableScriptSr.sys_id, name: tableScriptSr.name, title: tableScriptSr.name };
        tableTypes.filter(t => t.sys_id === tableScriptSr.getValue('table_id')).forEach(table => table.scripts.push(scriptRecord));
        relatedTablesArr.filter(relT => relT.sys_id === tableScriptSr.getValue('table_id')).forEach(relatedTable => relatedTable.scripts.push(scriptRecord));
    }

    return tableTypes;
}