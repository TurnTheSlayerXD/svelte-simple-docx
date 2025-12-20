
window.s_widget_custom = window.s_widget_custom || {};

(async function main() {
    s_widget.setFieldValue('currentTableName', s_form.getTableName());
    await serverUpdate('init');
})();

s_widget_custom.onGenerateButtonClick = async () => {
    s_widget.setFieldValue('isGenerateButtonDisabled', true);
    s_widget.setFieldValue('isReferenceFieldReadOnly', true);
    await doGenerationAlgorithm();
    s_widget.setFieldValue('isGenerateButtonDisabled', false);
    s_widget.setFieldValue('isReferenceFieldReadOnly', false);
};

s_widget_custom.onReferenceChange = () => {
    const currentTemplate = s_widget.getFieldValue('currentTemplate');
    s_widget.setFieldValue('isGenerateButtonDisabled', !!(currentTemplate?.database_value) ? false : true);
};

async function serverUpdate(action) {
    s_widget.setFieldValue('action', action);
    await s_widget.serverUpdate();
    s_widget.setFieldValue('action', '');
}

async function doGenerationAlgorithm() {
    const TEMPLATE_RECORD_ID = s_widget.getFieldValue('currentTemplate').database_value;
    const TEMPLATE_TABLE_ID = '176580796911236520';

    const [base64, templateRecord, docxScriptText] = await Promise.all([
        new Promise(async (resolve) => {
            const simpleAjax = new SimpleAjax();
            await simpleAjax.runAdminScript(
                `
                    const docId = ss.getDocIdByIds('${TEMPLATE_TABLE_ID}', '${TEMPLATE_RECORD_ID}');
                    const attachmentSr = new SimpleRecord('sys_attachment');
                    attachmentSr.addQuery('record_document_id', docId);
                    attachmentSr.selectAttributes('sys_id');
                    attachmentSr.setLimit(1);
                    attachmentSr.query();
                    attachmentSr.next();
                    const read = new SimpleAttachment();
                    setResult(read.readBase64(attachmentSr.sys_id));
                `,
                null,
                (response) => {
                    resolve(response.data.result);
                }
            );
        }),
        new Promise(resolve => {
            const record = new SimpleRecord('itam_task_docx_template');
            record.get(TEMPLATE_RECORD_ID, () => {
                resolve(JSON.parse(record.template_data));
            });
        }),
        fetch('/rest/v1/table/sys_script/176538018815432077?sysparm_exclude_reference_link=1', {
            headers: {
                'Authorization': `Bearer ${s_user.accessToken}`,
            },
        }).then(r => r.json()).then(json => json.data[0].script),
    ]);

    eval(docxScriptText);

    const patches = {};
    for (const { template, originalValue, value: dbValue } of templateRecord.templateToRealValue) {
        let textToPush;
        if (dbValue.sys_id) {
            const displayValue = s_form.getDisplayValue(dbValue.name);
            textToPush = displayValue ? displayValue : dbValue.title;
        } else {
            textToPush = originalValue;
        }
        const fixedTemplate = template.replace('{{', '').replace('}}', '');
        patches[fixedTemplate] = { type: docx.PatchType.PARAGRAPH, children: [new docx.TextRun(textToPush)] };
    }

    const decodedStr = window.atob(base64.replace('base64').trim());
    const buf = [];
    for (let i = 0; i < decodedStr.length; ++i) {
        buf.push(decodedStr.charCodeAt(i));
    }
    const inputBlob = new Blob([new Uint8Array(buf)]);

    const tableColumnDescription = templateRecord
        .detectedTables
        .filter(table => table.value.sys_id)
        .map(table => ({
            table_name: table.value.name,
            related_list_sys_id: table.value.related_list_sys_id,
            columns: table.columns.filter(col => col.value.sys_id).map(col => col.value.name),
        }));

    console.log(tableColumnDescription);
    s_widget.setFieldValue('tableNameOfCurrentTask', s_form.getTableName());
    s_widget.setFieldValue('idOfCurrentTask', s_form.getUniqueValue());
    s_widget.setFieldValue('tableColumnDescription', tableColumnDescription);
    await serverUpdate('fetchTableData');

    const tablesWithRows = s_widget.getFieldValue('resultData');

    templateRecord.detectedTables.forEach(dt => {
        if (dt.value.sys_id) {
            const rowsOfAlgo = [];
            console.log('tablesWithRows', tablesWithRows.map(t => t.related_list_sys_id));
            console.log('templateRecord.detectedTables', templateRecord.detectedTables.map(t => t.value.related_list_sys_id));
            const rowData = tablesWithRows
                .find(({ related_list_sys_id }) => related_list_sys_id === dt.value.related_list_sys_id)
                .rows;

            let enumerationIndex = 1;
            for (const row of rowData) {
                const rowOfAlgo = [];
                for (const { value } of dt.columns) {
                    if (value.isEnumerationColumn) {
                        rowOfAlgo.push(enumerationIndex);
                    }
                    else {
                        rowOfAlgo.push('');
                    }
                }
                ++enumerationIndex;
                for (const [key, value] of Object.entries(row)) {
                    const indexOfColumn = dt.columns.findIndex(c => c.value.name === key);
                    (0 <= indexOfColumn && indexOfColumn < rowOfAlgo.length) || throwError('index out of range');
                    rowOfAlgo[indexOfColumn] = value;
                }
                rowsOfAlgo.push(rowOfAlgo);
            }
            dt.rows = rowsOfAlgo;
        }
    });

    let globalTableIndex = 0;
    function detectTables(json) {
        const tableJsonElements = findElementsByTypeAndName(json, null, 'element', 'w:tbl').map(t => t.e);
        for (let i = 0; i < tableJsonElements.length; ++i) {
            const mappedTable = templateRecord.detectedTables.find(dt => dt.tableOrderIndex === globalTableIndex + i);
            if (mappedTable.value.sys_id) {
                const tableStruct = new TableStruct(tableJsonElements[i]);
                tableStruct.fillWithContent(
                    mappedTable.columns.map(c => c.template),
                    mappedTable.rows,
                );
            }
        }
        globalTableIndex += tableJsonElements.length;
    }

    const outputBlob = await docx.patchDocument(
        {
            outputType: "blob",
            data: inputBlob,
            patches,
            placeholderDelimiters: { start: '{{', end: '}}' },
            recursive: true,
            keepOriginalStyles: true,
        },
        detectTables,
    );

    const url = URL.createObjectURL(outputBlob);
    const aHref = document.createElement('a');
    aHref.href = url;
    aHref.click();
    URL.revokeObjectURL(url);

}

function throwError(...msg) {
    msg = msg.join(";\t");
    console.error(msg);
    throw new Error(msg);
}

function my_assert(cond, msg) {
    cond || throwError(msg);
}

function findElementsByTypeAndName(v, p, type, name) {
    if (v.type === type && v.name === name) {
        return [{ e: v, p: v }];
    }
    if (!v.elements) {
        return [];
    }
    const result = [];
    for (const child of v.elements) {
        result.push(...findElementsByTypeAndName(child, v, type, name));
    }
    return result;
};

function all_of(arr, cbk) {
    return !arr.some(t => !cbk(t));
}

const w_r_template = `
{
"type": "element",
"name": "w:r",
"attributes": {
    "w:rsidRPr": "0035116E"
},
"elements": [
    {
        "type": "element",
        "name": "w:rPr",
        "elements": [
            {
                "type": "element",
                "name": "w:rFonts",
                "attributes": {
                    "w:ascii": "Times New Roman",
                    "w:hAnsi": "Times New Roman",
                    "w:cs": "Times New Roman"
                }
            },
            {
                "type": "element",
                "name": "w:sz",
                "attributes": {
                    "w:val": "24"
                }
            },
            {
                "type": "element",
                "name": "w:szCs",
                "attributes": {
                    "w:val": "24"
                }
            }
        ]
    }
]
}`;
const w_t_template = `
{
    "type": "element",
    "name": "w:t",
    "elements": []
}`;

class ColumnStruct {
    textRefs;
    text;
    constructor(root) {
        this.root = root;
        my_assert(root.name === 'w:tc', 'not tc');
        this.textRefs = [];
        const localCbk = (e) => {
            if (e.type === 'text') {
                this.textRefs.push(e);
            }
            if (!e.elements) {
                return;
            }
            for (const c of e.elements) {
                localCbk(c);
            }
        };
        localCbk(root);
        this.text = this.calcText();
    }

    calcText() {
        let text = '';
        for (const e of this.textRefs) {
            text += e.text;
        }
        return text.trim();
    }

    isColEmpty() {
        return this.text.length === 0;
    }

    insertText(text) {
        if (this.textRefs.length > 0) {
            this.textRefs[0].text = text;
            this.text = this.calcText();
        }
        else {
            console.log('no text elements provided');
            const textElement = { type: "text", text: text };
            const w_p = findElementsByTypeAndName(this.root, null, "element", "w:p")[0]?.e;
            if (!w_p) {
                throwError("Cold not find w:p element to insert text");
            }
            w_p.elements = w_p.elements ?? [];
            let w_r = findElementsByTypeAndName(w_p, null, "element", "w:r")[0]?.e;
            if (!w_r) {
                w_r = JSON.parse(w_r_template);
                w_p.elements.push(w_r);
            }
            if (!w_r.elements) {
                w_r.elements = [];
            }
            let w_t = findElementsByTypeAndName(w_r, null, "element", "w:t")[0]?.e;
            if (!w_t) {
                w_t = JSON.parse(w_t_template);
                w_r.elements.push(w_t);
            }
            w_t.elements = w_t.elements ?? [];
            w_t.elements.push(textElement);
            this.textRefs.push(textElement);
            this.text = this.calcText();
        }
    }
}

class RowStruct {
    cols;
    indexInJson;
    root;
    constructor(root, indexInJson) {
        this.root = root;
        this.indexInJson = indexInJson;
        my_assert(root.name === 'w:tr', 'not tr');
        this.cols = findElementsByTypeAndName(root, this.root, 'element', 'w:tc').map(({ e }) => new ColumnStruct(e));
    }

    isRowEmpty() {
        return all_of(this.cols, t => t.isColEmpty());
    }

    doesMatch(cols) {
        if (cols.length !== this.cols.length) {
            return false;
        }
        for (let i = 0; i < cols.length; ++i) {
            if (cols[i] !== this.cols[i].text) {
                return false;
            }
        }
        return true;
    }

    colsCount() {
        return this.cols.length;
    }

    isOnlyNumericalColFilled() {
        return this.cols.length > 0 && Number.isFinite(parseInt(this.cols[0].text)) && all_of(this.cols.slice(1,), t => t.isColEmpty());
    }

    cloneWithTextCleaned(indexInJson) {
        const localCbk = (node) => {
            if (!node.elements) {
                return;
            }
            for (const n of node.elements) {
                if (n?.type === 'text') {
                    n.text = "";
                }
                localCbk(n);
            }
        };
        const trEmpty = JSON.parse(JSON.stringify(this.root));
        localCbk(trEmpty);
        return new RowStruct(trEmpty, indexInJson);
    }

    insertTextsPerColumn(texts) {
        my_assert(texts.length === this.cols.length, 'lens do not match');
        for (let i = 0; i < this.cols.length; ++i) {
            this.cols[i].insertText(texts[i]);
        }
    }

    textContent() {
        return this.cols.map(t => t.text).join(' | ');
    }
}

function collectText(e) {
    let texts = [];
    const cbk = (e) => {
        if (e.type === 'text') {
            texts.push(typeof e.text !== 'string' ? '' : e.text);
        }
        if (!e.elements) {
            return;
        }
        for (const c of e.elements) {
            cbk(c);
        }
    };
    cbk(e);
    return texts.join(' | ');
}

class TableStruct {
    rows;
    root;
    constructor(root) {
        this.root = root;
        my_assert(root.name === 'w:tbl', 'not table');
        this.rows = this.root.elements
            .map((r, i) => [r, i])
            .filter(([r, i]) => r.name === 'w:tr')
            .map(r => new RowStruct(r[0], r[1]));
    }

    insertRow(rowToClone, index, contents) {
        // to sync with json structure
        const rootElements = this.root.elements;
        rootElements.push(null);
        let newRow;
        if (index < this.rows.length) {
            for (let i = rootElements.length - 1; i > this.rows[index].indexInJson; --i) {
                rootElements[i] = rootElements[i - 1];
            }
            newRow = rowToClone.cloneWithTextCleaned(this.rows[index].indexInJson);
        }
        else {
            newRow = rowToClone.cloneWithTextCleaned(rootElements.length - 1);
        }
        newRow.insertTextsPerColumn(contents);
        this.rows.push(null);
        for (let i = this.rows.length - 1; i > index; --i) {
            this.rows[i] = this.rows[i - 1];
            this.rows[i].indexInJson += 1;
        }
        this.rows[index] = newRow;
        rootElements[newRow.indexInJson] = newRow.root;
    }

    fillWithContent(colnames, rowsGenerator) {
        const headerRowIndex = this.rows.findIndex(t => t.doesMatch(colnames));
        if (headerRowIndex === -1) {
            throwError('no header row found');
        }
        if (headerRowIndex + 1 >= this.rows.length) {
            let indexToInsert = headerRowIndex + 1;
            for (const row of rowsGenerator) {
                this.insertRow(this.rows[headerRowIndex], indexToInsert, row);
                indexToInsert += 1;
            }
        }
        else {
            const afterHeaderRow = this.rows[headerRowIndex + 1];
            if (afterHeaderRow.isRowEmpty() || afterHeaderRow.isOnlyNumericalColFilled()) {
                let indexToInsert = headerRowIndex + 1;
                const rowToCopy = this.rows[headerRowIndex + 1];
                this.rows.splice(headerRowIndex + 1, 1);
                for (let i = headerRowIndex; i < this.rows.length; ++i) {
                    this.rows[i].indexInJson -= 1;
                }
                this.root.elements.splice(rowToCopy.indexInJson, 1);
                for (const row of rowsGenerator) {
                    this.insertRow(rowToCopy, indexToInsert, row);
                    indexToInsert += 1;
                    // console.log(this.rows.map(t => ({ text: t.textContent(), index: t.indexInJson })));
                    // console.log(this.root.elements.map((t, i) => ({ text: collectText(t), index: i })));
                    // console.log();
                }
            }
        }
        for (let i = this.rows.length - 1; i > -1; --i) {
            if (this.rows[i].isRowEmpty()) {
                this.root.elements.splice(this.rows[i].indexInJson, 1);
            }
        }
        return this.root;
    }
}