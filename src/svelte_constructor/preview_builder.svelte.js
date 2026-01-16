import { UNREACHABLE } from "./helper.svelte";


export function getPreviewObjectFromFieldTemplate(renderRootId, fieldTemplate) {
    const renderRoot = document.getElementById(renderRootId);
    const expression = `//*[contains(text(),'${fieldTemplate}')]`;
    const iterResult = document.evaluate(expression, renderRoot);
    let targetNode = iterResult.iterateNext();
    if (!targetNode) {
        throw new Error(`failed obtaining node from template ${fieldTemplate}`);
    }
    return targetNode;
}

export function setPreviewedDocxField(renderRootId, field) {
    let wasAlreadyReplaced = true;
    if (!field.previewField) {
        wasAlreadyReplaced = false;
        field.previewField = getPreviewObjectFromFieldTemplate(renderRootId, field.templateStr);
    }

    const { previewField: previewHook } = field;
    if (!document.contains(previewHook)) {
        throw new Error(`failed obtaining node from ${field.templateStr}`);
    }

    if (!(previewHook instanceof Element)) {
        throw new Error('targetNode IS NOT instanceof Element');
    }

    const { width: previewHookWidth, height: previewHookHeight } = previewHook.getBoundingClientRect();
    previewHook.replaceChildren();
    previewHook.style.display = 'inline';
    previewHook.style.whiteSpace = 'nowrap';

    const hasMappedValue = !!field.dbMappedColumn.sys_id;

    while (previewHook.lastChild) {
        previewHook.removeChild(previewHook.lastChild);
    }

    if (hasMappedValue) {

        previewHook.insertAdjacentHTML('afterbegin',
            `
                <button
                    style=" max-width: ${previewHookWidth}px; 
                        max-height: ${previewHookHeight + 3}px; 
                        display: inline;
                        white-space: nowrap;
                        position: unset;"
                    class="src-components-button-___styles-module__Icon___gxSRu src-components-dynamicForms-view-field-reference-___styles-module__Badge___In6nV"
                    type="button"
                    onclick="window.onPreviewInputFocus('${field.templateStr}');">
                        ${field.dbMappedColumn.display_value}
                </button>
            `
        );
    } else {
        previewHook.insertAdjacentHTML('afterbegin', `	
            <input
                type="text"
                style=" max-width: ${previewHookWidth}px; 
                        max-height: ${previewHookHeight}px; 
                        display: inline;
                        white-space: nowrap;"
                onfocus="window.onPreviewInputFocus('${field.templateStr}');"
            />
        `);
    }
    // const { dbMappedColumn } = field;
    // if (dbMappedColumn.sys_id || dbMappedColumn.isEnumerated) {
    //     targetNode.style.backgroundColor = 'green';
    // } else {
    //     targetNode.style.backgroundColor = 'yellow';
    // }
}


export function* iterTableElements(renderRootId) {
    const rootElem = document.getElementById(renderRootId);
    if (!rootElem) {
        UNREACHABLE();
    }
    const tableElements = rootElem.querySelectorAll('table');
    for (const elem of tableElements) {
        yield elem;
    }
}