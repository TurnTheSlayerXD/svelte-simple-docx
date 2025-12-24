

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

if (input.action === 'fetchTableColumns') {
    const { tableNameOfCurrentTask, idOfCurrentTask, requiredColumns, requiredScripts } = input;
    const taskSr = new SimpleRecord(tableNameOfCurrentTask);
    taskSr.addQuery('sys_id', idOfCurrentTask);
    taskSr.setLimit(1);
    taskSr.query();
    if (!taskSr.next()) {
        throw new Error('no such task');
    }
    let returnObject = {};
    for (const column of requiredColumns) {
        returnObject[column] = taskSr.getDisplayValue(column);
    }
    data.dataOfCurrentTaskPerColumn = returnObject;

    const mappingScriptSr = new SimpleRecord('itam_script_table_mapping');
    mappingScriptSr.addQuery('sys_id', 'in', requiredScripts.map(t => t.script_id));
    mappingScriptSr.selectAttributes(['script_text']);
    mappingScriptSr.query();
    returnObject = {};
    while (mappingScriptSr.next()) {
        const resultOfSciptEvaluation = (() => {
            eval(mappingScriptSr.script_text);
            return extractValue(taskSr);
        })();
        const matchingTemplate = requiredScripts.find(t => t.script_id === mappingScriptSr.sys_id).template;
        returnObject[matchingTemplate] = resultOfSciptEvaluation;
    }
    data.dataOfCurrentTaskPerScript = returnObject;
}
else if (input.action === 'fetchTableData') {
    const { tableColumnDescription, idOfCurrentTask, tableNameOfCurrentTask } = input;
    const relatedListElementSr = new SimpleRecord('sys_ui_related_list_element');
    relatedListElementSr.addQuery('sys_id', 'in', tableColumnDescription.map(dt => dt.related_list_sys_id));
    relatedListElementSr.selectAttributes(['related_column_id', 'related_list_script_id']);
    relatedListElementSr.query();

    const resultData = [];

    const taskSr = new SimpleRecord(tableNameOfCurrentTask);
    taskSr.get(idOfCurrentTask);

    while (relatedListElementSr.next()) {

        resultData.push({ related_list_sys_id: relatedListElementSr.sys_id, rows: [], script_rows: [], });
        const dataOfCurrentTable = resultData.at(-1);

        const currentDesciption = tableColumnDescription.find(dt => dt.related_list_sys_id === relatedListElementSr.sys_id);

        if (relatedListElementSr.getValue('related_list_script_id')) {

            const relatedListScriptSr = relatedListElementSr.related_list_script_id;
            relatedListScriptSr.query_from.name === currentDesciption.table_name || throwError('Unmatched tablename', relatedListScriptSr.query_from.name, currentDesciption.table_name);

            const queryFromSr = new SimpleRecord(relatedListScriptSr.query_from.name);
            const queryDataScript = relatedListScriptSr.query_with;

            //isolated
            (() => {
                const mappingScriptSr = new SimpleRecord('itam_script_table_mapping');
                mappingScriptSr.addQuery('sys_id', 'in', currentDesciption.scripts.map(t => t.script_id));
                mappingScriptSr.selectAttributes(['script_text']);
                mappingScriptSr.query();
                const mappingScriptTexts = [];
                while (mappingScriptSr.next()) {
                    mappingScriptTexts.push({
                        template: currentDesciption.scripts.find(t => t.script_id === mappingScriptSr.sys_id).template,
                        mappingScriptText: mappingScriptSr.script_text,
                    });
                }
                const current = queryFromSr;
                const parent = taskSr;

                eval(queryDataScript);

                current.query();
                while (current.next()) {
                    const newDataRow = {};
                    for (const column of currentDesciption.columns) {
                        newDataRow[column] = current.getDisplayValue(column);
                    }
                    dataOfCurrentTable.rows.push(newDataRow);

                    const newScriptDataRow = {};
                    for (const { template, mappingScriptText } of mappingScriptTexts) {
                        const scriptResult = (() => {

                            eval(mappingScriptText);

                            return extractValue(current);
                        })();
                        newScriptDataRow[template] = scriptResult;
                    }

                    dataOfCurrentTable.script_rows.push(newScriptDataRow);
                }

            })();
            //end of isolation
        }
        else {
            const relatedColumnName = relatedListElementSr.related_column_id.column_name;

            relatedListElementSr.related_table_id.name === currentDesciptio.table_name || throwError('Unmatched tablename', relatedListElementSr.related_table_id.name, currentDesciptio.table_name);

            const relatedTableSr = new SimpleRecord(relatedListElementSr.related_table_id.name);
            relatedTableSr.addQuery(relatedColumnName, taskSr.sys_id);
            relatedTableSr.selectAttributes(currentDesciption.columns);
            while (relatedTableSr.next()) {
                const newDataRow = {};
                for (const column of currentDesciption.columns) {
                    newDataRow[column] = relatedTableSr.getDisplayValue(column);
                }
                dataOfCurrentTable.rows.push(newDataRow);
            }
        }

        if (currentDesciption.scripts.length === 0) {
            continue;
        }



    }

    data.resultData = resultData;
}

function throwError(...message) {
    throw new Error(message.join('\t'));
}


function getMappingScriptDataFromDescription(currentDescription) {

}