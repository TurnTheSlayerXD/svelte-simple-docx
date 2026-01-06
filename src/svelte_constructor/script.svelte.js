
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


let currentDocxArrayBuffer;
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
    fieldHook: null,
    optionsHook: null,

    currentOption: null,

    reset: function () {
        this.isVisible = false;
        this.options = [];
        this.currentOption = null;
    },
});

export const configBeingModified = $state({
    currentOption: null,
    fieldHook: null,
    optionsHook: null,
});


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
        currentDocxArrayBuffer = arrayBuffer;
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

import { renderAsync } from "../../docxjs/dist/docx-preview.mjs"
import { getPreviewObjectFromFieldTemplate, getPreviewObjectFromTableTemplate } from "./preview_builder.svelte";

async function doDocxRendering(blob) {
    const docxRenderRoot = document.getElementById("docx-render-root");
    const rsp = await renderAsync(blob, docxRenderRoot);
    return "docx-render-root";
}

// import * as docx from "../../../../dev_scripts";
async function processFile(fileBlob, fileName) {
    try {
        const replacementFields = [];
        let gen = function* () {
            let i = 0;
            while (true) {
                let obj = {};
                replacementFields.push(`{{field_${i++}}}`);
                obj = {
                    type: docx.PatchType.PARAGRAPH,
                    children: [new docx.TextRun(replacementFields.at(-1))],
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

        const previewRenderRoot = await doDocxRendering(outputBlob);

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

        const remplacementWithReplaced = replacementFields.map((template, index) => ({
            template,
            originalValue: regexReplacer.replacedValues[index],
            optionField: {
                currentOption: emptyColumnOption,
                fieldHook: null,
                optionsHook: null,
            },
            previewField: getPreviewObjectFromFieldTemplate(previewRenderRoot, template),
        }));
        templateToRealValue.push(...remplacementWithReplaced);

        //{ template: string, title: string | null, cols: string[], sourceIndex: number };
        // prototype: {templateName: string | undefined, templateColumns: { templateName: string, currentOption }[], } []
        svelteDetectedTables.push(
            ...tablesFromDocx.map((t) => ({
                tableOrderIndex: t.tableIndex,
                templateName: t.cols.join(" | "),
                optionField: {
                    currentOption: emptyTableOption,
                },
                templateColumns: t.cols.map((colName) => ({
                    template: colName,
                    optionField: {
                        currentOption: emptyColumnOption,
                    },
                    previewField: getPreviewObjectFromTableTemplate(previewRenderRoot, t.tableIndex, colName),
                })),
            })),
        );

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
    const base64 = s_widget.getFieldValue('base64');
    s_widget.setFieldValue('docxTemplateRecord', '');
    s_widget.setFieldValue('base64', '');

    currentDocxArrayBuffer = base64DecodeIntoArrayBuffer(base64);

    const previewRootId = await doDocxRendering(new Blob([currentDocxArrayBuffer]));

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
            currentOption: cnf.value,
            fieldHook: null,
            optionsHook: null,
        },
        previewField: getPreviewObjectFromFieldTemplate(previewRootId, cnf.template),
    }));
    clearArray(templateToRealValue);
    templateToRealValue.push(...newTemplateToRealValue);



    // mapping related lists and their columns
    const newSvelteDetectedTables = templateData.detectedTables
        .map(cnf => ({

            tableOrderIndex: cnf.tableOrderIndex,
            templateName: cnf.columns.map(col => col.template).join(" | "),
            optionField: {
                // special because we need references to tableTypes
                currentOption: tableTypes
                    .find(table => table.sys_id === currentConfig.table_id)
                    ?.relatedTables
                    ?.find(relatedTable => relatedTable.sys_id === cnf.value.sys_id) || throwError('UNREACHABLE'),
            },
            templateColumns: cnf.columns.map((col) => ({
                template: col.template,
                optionField: {
                    currentOption: col.value,
                },
                previewField: getPreviewObjectFromTableTemplate(previewRootId, cnf.tableOrderIndex, col.template),
            })),
        }));
    clearArray(svelteDetectedTables);
    svelteDetectedTables.push(...newSvelteDetectedTables);
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


