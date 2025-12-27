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