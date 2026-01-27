

if (input.action === 'init') {
    const { currentTableName } = input;

    const tableSr = new SimpleRecord('sys_db_table');
    tableSr.addQuery('name', currentTableName);
    tableSr.selectAttributes('sys_id');
    tableSr.setLimit(1);
    tableSr.query();
    if (!tableSr.next()) {
        return;
    }

    data.condition = `task_table_id=${tableSr.sys_id}`;
    data.isGenerateButtonDisabled = true;
    data.isReferenceFieldReadOnly = false;
    return;
}

if (input.action === 'fetchTableData') {
    const { templateSysId, recordSysIdToSearchDataFrom, recordTableName } = input;

    const templateSr = new SimpleRecord("itam_task_docx_template");
    templateSr.get(templateSysId);

    const templateData = JSON.parse(templateSr.template_data);

    const current = new SimpleRecord(recordTableName);
    current.get(recordSysIdToSearchDataFrom);

    myAssert(templateData.selectTaskField.name === recordTableName);


    const resultData = [];
    for (const field of templateData.templateToRealValue) {

        const result = { templateString: null, replacementData: { isRowData: false, replacementString: null } };

        result.templateString = field.templateString;

        if (!field.value.sys_id) {
            result.replacementData.isRowData = false;
            result.replacementData.replacementString = field.sourceString;
        }
        else if (field.value.isScripted) {

            const scriptSr = new SimpleRecord("itam_script_table_mapping");
            scriptSr.get(field.value.sys_id);

            if (scriptSr.does_return_list && !field.isInsideRow) {
                throwError("scriptSr.does_return_list && !field.isInsideRow");
            }

            eval(scriptSr.script_text);
            const ret = extractValue(current);

            if (scriptSr.does_return_list) {
                myAssert(typeof ret === "object" && ret instanceof Array);

                for (const str of ret) {
                    myAssert(typeof str === "string");
                }

                result.replacementData.isRowData = true;
                result.replacementData.replacements = ret;
                result.replacementData.rowGroupId = field.rowGroupId;
            }
            else {
                myAssert(typeof ret === "string");
                result.replacementData.isRowData = false;
                result.replacementData.replacementString = ret;
            }

        }
        else {
            result.replacementData.isRowData = false;
            result.replacementData.replacementString = current[field.value.name];
        }

        resultData.push(result);
    }

    data.resultData = resultData;
}


function myAssert(condition, message = '') {

    if (!condition) {
        throw new Error(`Assertion failed with message: ${message}`);
    }
}

function throwError(...message) {
    throw new Error(message.join('\t'));
}


function getMappingScriptDataFromDescription(currentDescription) {

}