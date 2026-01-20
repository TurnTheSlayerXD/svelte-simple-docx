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
        const newButtonElement = document.createElement('button');
        newButtonElement.style.maxWidth = previewHookWidth + 'px';
        newButtonElement.style.maxHeight = (previewHookHeight + 3) + 'px';
        newButtonElement.style.display = 'inline';
        newButtonElement.style.whiteSpace = 'nowrap';
        newButtonElement.style.position = 'unset';
        newButtonElement.classList.add('src-components-button-___styles-module__Icon___gxSRu');
        newButtonElement.classList.add('src-components-dynamicForms-view-field-reference-___styles-module__Badge___In6nV');
        newButtonElement.type = 'button';
        newButtonElement.onclick = () => {
            window.onPreviewInputFocus(field);
        };
        newButtonElement.insertAdjacentText('afterbegin', field.dbMappedColumn.display_value);
        previewHook.insertAdjacentElement('afterbegin', newButtonElement);
    } else {
        const newInputElement = document.createElement('input');
        newInputElement.style.maxWidth = previewHookWidth + 'px';
        newInputElement.style.maxHeight = previewHookHeight + 'px';
        newInputElement.style.display = 'inline';
        newInputElement.style.whiteSpace = 'nowrap';
        newInputElement.onfocus = () => {
            window.onPreviewInputFocus(field);
        };
        previewHook.insertAdjacentElement('afterbegin', newInputElement);
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