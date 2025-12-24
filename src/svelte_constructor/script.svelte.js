
export const emptyColumnOption = {
    sys_id: null,
    title: "--Undefined--",
    name: null,
};

export const enumerationColumnOption = {
    sys_id: null,
    title: "Enumerated",
    name: "enumerated",
    isEnumerationColumn: true
};

export const emptyScriptedColumnOption = {
    sys_id: null,
    title: "--Undefined--",
    name: null,
    isScripted: true,
};

export const emptyTableOption = {
    sys_id: null,
    name: null,
    title: "--Undefined--",
    columns: [emptyColumnOption],

    related_list_name: "--Undefined--",
    related_list_sys_id: null,

    relatedTables: [
        {
            sys_id: null,
            name: null,
            title: "--Undefined--",
            related_list_name: "--Undefined--",
            related_list_sys_id: null,
        }],
};

export const trackedSelectButtons = [];

export function addSelfToTrackedButtons(btn) {
    trackedSelectButtons.push(btn);
}

let docxUrl = "";
let files;

export const docxFiles = {
    sourceDocx: null,
    templateDocx: null,
};

export const templateToRealValue = $state([]);

// prototype: {templateName: string | undefined, templateColumns: {templateName: string, currentOption }[], } []
export const svelteDetectedTables = $state([]);

export const buttonsState = $state({
    isUploadPreproccessedDisabled: true,
});

export const uploadedFiles = $state([]);

export const containerState = $state({ isDragging: false });

export const selectTaskField = $state({
    isVisible: false,
    options: [],
    isOptionsOpened: false,
    fieldHook: null,
    optionsHook: null,

    currentOption: null,

    reset: function () {
        this.isVisible = false;
        this.options = [];
        this.isOptionsOpened = false;
        this.currentOption = null;
    },
});

export const configBeingModified = $state({
    currentOption: null,
    isOptionsOpened: false,
    fieldHook: null,
    optionsHook: null,
});

addSelfToTrackedButtons(selectTaskField);

function resetWidgetState() {
    selectTaskField.reset();
    while (svelteDetectedTables.length > 0) {
        svelteDetectedTables.pop();
    }
    while (templateToRealValue.length > 0) {
        templateToRealValue.pop();
    }
    clearArray(templateToRealValue);
    clearArray(svelteDetectedTables);
}


serverUpdate("fetchDocxScript").then(() => {
    eval(s_widget.getFieldValue("docxLibraryScript"));
    s_widget.setFieldValue("docxLibraryScript", "");
});

export function onWindowClick(e) {
    let { target } = e;
    while (target && !target.getAttribute("dropdown")) {
        target = target.parentElement;
    }

    if (!target) {
        for (const btn of trackedSelectButtons) {
            btn.isOptionsOpened = false;
        }
    }
}

export function uploadFromDevice() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.accept = ".docx";

    const handleChange = async (target) => {
        const { files } = target.currentTarget;
        if (!files) {
            return;
        }
        removeFile(uploadedFiles);
        const file = files[0];

        const arrayBuffer = await file.arrayBuffer();
        s_widget.setFieldValue("docxFileArrayBuffer", arrayBuffer);
        s_widget.setFieldValue("docxFileName", file.name);
        await serverUpdate("createAttachmentAndReturnUrl");
        s_widget.setFieldValue("docxFileArrayBuffer", '');
        s_widget.setFieldValue("docxFileName", '');

        const attachmentUrl = s_widget.getFieldValue("attachmentUrl");
        console.log("attachmenturl", attachmentUrl);
        s_widget.setFieldValue("attachmentUrl", "");

        await processFile(arrayBuffer, file.name);

        uploadedFiles.push({ fileName: file.name });
    };

    fileInput.addEventListener("change", handleChange);
    fileInput.click();
}

export async function serverUpdate(action) {
    s_widget.setFieldValue("action", action);
    await s_widget.serverUpdate();
    s_widget.setFieldValue("action", "");
}

export function removeFile(file) {
    if (file) {
        resetWidgetState();
        buttonsState.isUploadPreproccessedDisabled = true;
        return uploadedFiles.splice(uploadedFiles.indexOf(file));
    }
    buttonsState.isUploadPreproccessedDisabled = true;
    return uploadedFiles.shift();
}
// import * as docx from "../../../../dev_scripts";
async function processFile(fileBlob, fileName) {
    try {
        const withStrs = [];
        let gen = function* () {
            let i = 0;
            while (true) {
                let obj = {};
                withStrs.push(`{{field_${i++}}}`);
                obj = {
                    type: docx.PatchType.PARAGRAPH,
                    children: [new docx.TextRun(withStrs.at(-1))],
                };
                yield obj;
            }
        };
        const patchGenerator = gen();
        const regexReplacer = new docx.RegexReplacer();

        tablesFromDocx = [];
        const outputBlob = await docx.patchDocument(
            {
                outputType: "blob",
                data: fileBlob,
                patches: patchGenerator,
                placeholderDelimiters: {
                    is_regex: true,
                    regex: /_{2,}/g,
                    regexReplacer,
                },
                recursive: true,
                keepOriginalStyles: true,
            },
            detectTables,
        );

        docxFiles.sourceDocx = fileBlob;
        docxFiles.templateDocx = outputBlob;

        docxUrl = URL.createObjectURL(outputBlob);

        buttonsState.isUploadPreproccessedDisabled = false;

        await serverUpdate("fetchItamTaskTypes");

        selectTaskField.isVisible = true;

        const tableTypes = JSON.parse(s_widget.getFieldValue("tableTypes"));
        s_widget.setFieldValue("tableTypes", '');

        for (const table of tableTypes) {
            table.columns.unshift(emptyColumnOption);
            table.scripts.forEach(s => s.isScripted = true);
            table.scripts.unshift(emptyScriptedColumnOption);
            for (const relatedTable of table.relatedTables) {
                relatedTable.columns.unshift(emptyColumnOption);
                relatedTable.scripts.forEach(s => s.isScripted = true);
                relatedTable.scripts.unshift(emptyScriptedColumnOption);
            }
            table.relatedTables.unshift(emptyTableOption);
        }

        selectTaskField.options.push(emptyTableOption, ...tableTypes);
        selectTaskField.currentOption = emptyTableOption;
        const combined = withStrs.map((s, i) => ({
            template: s,
            originalValue: regexReplacer.replacedValues[i],
            optionField: {
                isOptionsOpened: false,
                currentOption: emptyColumnOption,
                fieldHook: null,
                optionsHook: null,
            },
        }));

        templateToRealValue.push(...combined);
        for (const btn of templateToRealValue) {
            addSelfToTrackedButtons(btn.optionField);
        }

        //{ template: string, title: string | null, cols: string[], sourceIndex: number };
        // prototype: {templateName: string | undefined, templateColumns: { templateName: string, currentOption }[], } []
        svelteDetectedTables.push(
            ...tablesFromDocx.map((t) => ({
                tableOrderIndex: t.tableIndex,
                templateName: t.cols.join(" | "),
                optionField: {
                    isOptionsOpened: false,
                    currentOption: emptyTableOption,
                },
                templateColumns: t.cols.map((colName) => ({
                    template: colName,
                    optionField: {
                        currentOption: emptyColumnOption,
                        isOptionsOpened: false,
                    },
                })),
            })),
        );

        for (const tableBtn of svelteDetectedTables) {
            addSelfToTrackedButtons(tableBtn.optionField);
            for (const colBtn of tableBtn.templateColumns) {
                addSelfToTrackedButtons(colBtn.optionField);
            }
        }
    } catch (err) {
        console.error(err);
    }
}

export function downloadPreprocessedFile() {
    const link = document.createElement("a");
    link.download = "file.docx";
    link.href = docxUrl;
    link.click();
    // URL.revokeObjectURL(docxUrl);
}

export function uploadContainerDragOver(ev) {
    ev.preventDefault();
    ev.stopImmediatePropagation();
    containerState.isDragging = true;
}

export function uploadContainerDragLeave(ev) {
    console.log("uploadContainerDragLeave");
    ev.preventDefault();
    ev.stopImmediatePropagation();
    containerState.isDragging = false;
}

export function filezoneDrop(ev) {
    console.log("filezoneDrop");
    ev.preventDefault();
    ev.stopImmediatePropagation();
    console.log(ev);
    containerState.isDragging = false;
}

export async function handleFileAsync(ev) {
    removeFile();
    if (ev) {
        ev.target.value = "";
    }
    const file = files[0];
    // const parseResult = await parseFile(file);
    uploadedFiles.push(file);
}

export function onSelectTaskFieldClick() {
    for (const btn of trackedSelectButtons.filter(
        (btn) => btn !== selectTaskField,
    )) {
        btn.isOptionsOpened = false;
    }

    const { fieldHook, optionsHook } = selectTaskField;
    // optionsHook.style.width = fieldHook.offsetWidth + "px";
    optionsHook.style.minWidth = fieldHook.offsetWidth + "px";
    optionsHook.style.left = fieldHook.offsetLeft + "px";
    optionsHook.style.top =
        fieldHook.offsetTop + fieldHook.offsetHeight + "px";
    selectTaskField.isOptionsOpened = !selectTaskField.isOptionsOpened;
}

export function onChooseColumnClick(optionField) {
    for (const btn of trackedSelectButtons.filter(
        (btn) => btn !== optionField,
    )) {
        btn.isOptionsOpened = false;
    }

    const { fieldHook, optionsHook } = optionField;
    optionField.isOptionsOpened = !optionField.isOptionsOpened;
    // optionsHook.style.width = fieldHook.offsetWidth + "px";
    optionsHook.style.minWidth = fieldHook.offsetWidth + "px";
    optionsHook.style.left = fieldHook.offsetLeft + "px";
    optionsHook.style.top =
        fieldHook.offsetTop + fieldHook.offsetHeight + "px";
}

export function onChooseRelatedTableClick(optionField) {
    onChooseColumnClick(optionField);
}

export function onChooseRelatedTableColumn(relatedTable, table) {
    if (relatedTable !== table.optionField) {
        for (const col of table.templateColumns) {
            col.optionField.currentOption =
                emptyColumnOption;
        }
    }
    table.optionField.currentOption = relatedTable;
    table.optionField.isOptionsOpened = false;
}

export function onClickSelectTaskType(opt) {
    if (opt !== selectTaskField.currentOption) {
        for (const { optionField } of templateToRealValue) {
            optionField.currentOption = emptyColumnOption;
        }
        for (const relatedTable of svelteDetectedTables) {
            relatedTable.optionField.currentOption = emptyTableOption;
            for (const { optionField } of relatedTable.templateColumns) {
                optionField.currentOption = emptyColumnOption;
            }
        }
    }
    selectTaskField.currentOption = opt;
    selectTaskField.isOptionsOpened = false;
}

let tablesFromDocx = [];
function detectTables(json) {
    function getTextInside(tc) {
        function collect(tc, result) {
            if (!tc.elements) {
                return;
            }
            for (const child of tc.elements) {
                if (child.text) {
                    result.push(String(child.text));
                }
                collect(child, result);
            }
        }
        const result = [];
        collect(tc, result);
        return result.join("");
    }

    const findElementsByTypeAndName = (v, p, type, name) => {
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

    const getTableDescriptionFromRows = (tableIndex, rowsWithIndex) => {
        if (rowsWithIndex.length === 0) {
            return;
        }
        const [firstRow, firstSourceIndex] = rowsWithIndex[0];
        const [secondRow, secondSourceIndex] = rowsWithIndex[0];
        if (firstRow.length > 1) {
            return {
                tableIndex,
                title: null,
                cols: firstRow,
                sourceIndex: firstSourceIndex,
            };
        } else if (firstRow.length === 1 && secondRow.length > 1) {
            return {
                tableIndex,
                title: firstRow[0],
                cols: secondRow,
                sourceIndex: secondSourceIndex,
            };
        }
        return null;
    };

    const getRefToFirstText = (elem) => {
        if (typeof elem.text === "string") {
            return elem;
        }
        if (!elem.elements) {
            return null;
        }
        for (const child of elem.elements) {
            const val = getRefToFirstText(child);
            if (val) {
                return val;
            }
        }
        return null;
    };

    const tableElements = findElementsByTypeAndName(
        json,
        null,
        "element",
        "w:tbl",
    ).map((t) => t.e);
    for (let i = 0; i < tableElements.length; ++i) {
        const tableElem = tableElements[i];
        const trElements = tableElem.elements
            .map((t, i) => [t, i])
            .filter(([t]) => t?.name === "w:tr" && t.elements);

        const rowsWithText = trElements.map(([tr, index]) => [
            tr.elements
                .filter((t) => t.name === "w:tc")
                .map((t) => getTextInside(t))
                .filter((t) => !!t),
            index,
        ]);
        const description = getTableDescriptionFromRows(i, rowsWithText);
        if (description) {
            console.log(description);
            tablesFromDocx.push(description);
        }
    }
}

function getDbProps({ sys_id, name, title, isEnumerationColumn, related_list_name, related_list_sys_id, isScripted }) {
    return { sys_id, name, title, isEnumerationColumn, related_list_name, related_list_sys_id, isScripted };
}

function mobx(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export async function generateTemplate() {
    buttonsState.isUploadPreproccessedDisabled = true;
    console.log("generateTemplate");
    s_widget.setFieldValue(
        "selectTaskField",
        getDbProps(selectTaskField.currentOption),
    );
    s_widget.setFieldValue(
        "templateToRealValue",
        templateToRealValue.map(
            ({ template, originalValue, optionField }) => ({
                template,
                originalValue,
                value: getDbProps(optionField.currentOption),
            }),
        ),
    );
    s_widget.setFieldValue(
        "detectedTables",
        svelteDetectedTables.map((relatedTable) => ({
            value: getDbProps(relatedTable.optionField.currentOption),
            tableOrderIndex: relatedTable.tableOrderIndex,
            columns: relatedTable.templateColumns.map((t) => ({
                template: t.template,
                value: getDbProps(t.optionField.currentOption),
            })),
        })),
    );

    // if there is config selected - update existing
    if (configBeingModified.currentOption?.sys_id) {
        s_widget.setFieldValue('docxTemplateSysId', configBeingModified.currentOption.sys_id);
        await serverUpdate('updateExistingDocxTemplateRecord');
    }
    else {
        s_widget.setFieldValue(
            "docxBase64",
            base64EncodeArrayBuffer(await docxFiles.templateDocx.arrayBuffer()),
        );
        await serverUpdate("createDocxTemplate");
        buttonsState.isUploadPreproccessedDisabled = false;
    }
}

function base64EncodeArrayBuffer(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

export function onEnumerationOptionClick(column) {
    const { optionField } = column;
    if (optionField.currentOption?.isEnumerationColumn) {
        optionField.currentOption = (!optionField.previousOption || optionField.previousOption?.isScripted || optionField.previousOption?.isEnumerationColumn)
            ? emptyColumnOption : optionField.previousOption;
    }
    else {
        optionField.previousOption = optionField.currentOption;
        optionField.currentOption = enumerationColumnOption;
    }
}


export function onSciptedOptionClick(column) {

    const { optionField } = column;

    if (optionField.currentOption?.isScripted) {
        optionField.currentOption = (!optionField.previousOption || optionField.previousOption?.isScripted || optionField.previousOption?.isEnumerationColumn)
            ? emptyColumnOption : optionField.previousOption;
    }
    else {
        optionField.previousOption = optionField.currentOption;
        optionField.currentOption = emptyScriptedColumnOption;
    }
}

export async function getExistingDocxTemplateRecords() {
    await serverUpdate('getExistingDocxTemplateRecords');
    const result = JSON.parse(s_widget.getFieldValue('docxTemplateRecords'));
    s_widget.setFieldValue(s_widget.getFieldValue('docxTemplateRecords'), '');
    result.unshift({ sys_id: null, name: "--Undefined--", title: "--Undefined--" });
    return result;
}

function clearArray(arr) {
    while (arr.length > 0) {
        arr.pop();
    }
}


export async function onSelectExistingDocxTemplateClick(optionField, column) {
    if (!column.sys_id) {
        resetWidgetState();
        return;
    }

    if (column.sys_id === configBeingModified.currentOption?.sys_id) {
        console.log('ignore');
        return;
    }


    s_widget.setFieldValue('docxTemplateSysId', column.sys_id);
    await serverUpdate('getExistingDocxTemplateConfigById');
    const currentConfig = JSON.parse(s_widget.getFieldValue('docxTemplateRecord'));
    s_widget.setFieldValue('docxTemplateRecord', '');

    await serverUpdate("fetchItamTaskTypes");
    const tableTypes = JSON.parse(s_widget.getFieldValue("tableTypes"));
    s_widget.setFieldValue("tableTypes", '');


    selectTaskField.isVisible = true;


    for (const table of tableTypes) {
        table.columns.unshift(emptyColumnOption);
        table.scripts.forEach(s => s.isScripted = true);
        table.scripts.unshift(emptyScriptedColumnOption);

        for (const relatedTable of table.relatedTables) {
            relatedTable.columns.unshift(emptyColumnOption);
            relatedTable.scripts.forEach(s => s.isScripted = true);
            relatedTable.scripts.unshift(emptyScriptedColumnOption);
        }

        table.relatedTables.unshift(emptyTableOption);
    }

    clearArray(selectTaskField.options);
    selectTaskField.options.push(emptyTableOption, ...tableTypes);

    // looking for current optionSelected
    selectTaskField.currentOption = tableTypes.find(tt => tt.sys_id === currentConfig.table_id);

    //mapping task table columns
    const { template_data: templateData } = currentConfig;
    const newTemplateToRealValue = templateData.templateToRealValue.map(cnf => ({
        template: cnf.template,
        originalValue: cnf.originalValue,
        optionField: {
            isOptionsOpened: false,
            currentOption: cnf.value,
            fieldHook: null,
            optionsHook: null,
        },
    }));
    clearArray(templateToRealValue);
    templateToRealValue.push(...newTemplateToRealValue);

    // mapping related lists and their columns
    const newSvelteDetectedTables = templateData.detectedTables
        .map(cnf => ({

            tableOrderIndex: cnf.tableOrderIndex,
            templateName: cnf.columns.map(col => col.template).join(" | "),
            optionField: {
                isOptionsOpened: false,
                // special because we need references to tableTypes
                currentOption: tableTypes
                    .find(table => table.sys_id === currentConfig.table_id)
                    ?.relatedTables
                    ?.find(relatedTable => relatedTable.sys_id === cnf.value.sys_id) || throwError('UNREACHABLE'),
            },
            templateColumns: cnf.columns.map((col) => ({
                template: col.template,
                optionField: {
                    isOptionsOpened: false,
                    currentOption: col.value,
                }
            })),
        }));
    clearArray(svelteDetectedTables);
    svelteDetectedTables.push(...newSvelteDetectedTables);
}