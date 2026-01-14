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



export async function findPlacesInDocxToReplace(fileBlob) {
    tablesFromDocx = [];
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

    const underscoredWithTemplate = replacementFields.map((template, index) => ({
        templateStr: template,
        sourceStr: regexReplacer.replacedValues[index],
    }));

    const tables = tablesFromDocx.map(t => ({
        tableOrderIndex: t.tableIndex,
        formedTitleStr: t.cols.join(" | "),
        foundColumns: t.cols,
    }));
    return { outputBlob, fields: underscoredWithTemplate, tables, }
}