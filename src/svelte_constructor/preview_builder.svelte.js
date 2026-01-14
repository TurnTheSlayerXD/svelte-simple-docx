export function getPreviewObjectFromFieldTemplate(renderRootId, fieldTemplate) {
    const renderRoot = document.getElementById(renderRootId);
    const expression = `//*[contains(text(),'${fieldTemplate}')]`;
    const iterResult = document.evaluate(expression, renderRoot);
    let targetNode = iterResult.iterateNext();
    if (!targetNode) {
        throw new Error(`failed obtaining node from template ${fieldTemplate}`);
    }
    targetNode.style.backgroundColor = "yellow";
    return { expression, renderRootId };
}

export function getPreviewObjectFromTableTemplate(renderRoot, tableOrderIndex, templateColumn) {

    return null;
}


export function setColorForPreviewedDocxField(renderRootId, field) {
    if (!field.previewField) {
        field.previewField = getPreviewObjectFromFieldTemplate(renderRootId, field.templateStr);
    }

    const { expression } = field.previewField;
    const renderRootHook = document.getElementById(renderRootId);
    const iterResult = document.evaluate(expression, renderRootHook);
    let targetNode = iterResult.iterateNext();
    if (!targetNode) {
        throw new Error(`failed obtaining node from template ${field.templateStr}`);
    }

    const { dbMappedColumn } = field;
    if (dbMappedColumn.sys_id || dbMappedColumn.isEnumerated) {
        targetNode.style.backgroundColor = 'green';
    } else {
        targetNode.style.backgroundColor = 'yellow';
    }
}