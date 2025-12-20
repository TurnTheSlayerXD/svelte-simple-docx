

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
    const { tableColumnDescription, idOfCurrentTask, tableNameOfCurrentTask } = input;
    const relatedListElementSr = new SimpleRecord('sys_ui_related_list_element');
    relatedListElementSr.addQuery('sys_id', 'in', tableColumnDescription.map(dt => dt.related_list_sys_id));
    relatedListElementSr.selectAttributes(['related_column_id', 'related_list_script_id']);
    relatedListElementSr.query();

    const resultData = [];

    const taskSr = new SimpleRecord(tableNameOfCurrentTask);
    taskSr.get(idOfCurrentTask);

    while (relatedListElementSr.next()) {

        resultData.push({ related_list_sys_id: relatedListElementSr.sys_id, rows: [] });
        const dataOfCurrentTable = resultData.at(-1);

        const currentTable = tableColumnDescription.find(dt => dt.related_list_sys_id === relatedListElementSr.sys_id);

        if (relatedListElementSr.getValue('related_list_script_id')) {

            const relatedListScriptSr = relatedListElementSr.related_list_script_id;
            relatedListScriptSr.query_from.name === currentTable.table_name || throwError('Unmatched tablename', relatedListScriptSr.query_from.name, currentTable.table_name);

            const queryFromSr = new SimpleRecord(relatedListScriptSr.query_from.name);
            const scriptText = relatedListScriptSr.query_with;

            //isolated
            (() => {
                const current = queryFromSr;
                const parent = taskSr;

                eval(scriptText);

                current.selectAttributes(currentTable.columns);
                current.query();
                while (current.next()) {
                    const newDataRow = {};
                    for (const column of currentTable.columns) {
                        newDataRow[column] = current.getDisplayValue(column);
                    }
                    dataOfCurrentTable.rows.push(newDataRow);
                }

            })();
            //end of isolation
        }
        else {
            const relatedColumnName = relatedListElementSr.related_column_id.column_name;

            relatedListElementSr.related_table_id.name === currentTable.table_name || throwError('Unmatched tablename', relatedListElementSr.related_table_id.name, currentTable.table_name);

            const relatedTableSr = new SimpleRecord(relatedListElementSr.related_table_id.name);
            relatedTableSr.addQuery(relatedColumnName, taskSr.sys_id);
            relatedTableSr.selectAttributes(currentTable.columns);
            while (relatedTableSr.next()) {
                const newDataRow = {};
                for (const column of currentTable.columns) {
                    newDataRow[column] = relatedTableSr.getDisplayValue(column);
                }
                dataOfCurrentTable.rows.push(newDataRow);
            }
        }
    }

    data.resultData = resultData;
}

function throwError(...message) {
    throw new Error(message.join('\t'));
}