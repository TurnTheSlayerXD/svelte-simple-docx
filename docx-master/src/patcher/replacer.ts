import xml from "xml";
import { Element } from "xml-js";

import { Formatter } from "@export/formatter";
import { IContext, XmlComponent } from "@file/xml-components";

import { IPatch, PatchType } from "./from-docx";
import { findRunElementIndexWithToken, splitRunElement } from "./paragraph-split-inject";
import { replaceTokenInParagraphElement } from "./paragraph-token-replacer";
import { findLocationOfText, findLocationOfUnderline } from "./traverser";
import { toJson } from "./util";
import { PatchGenerator } from "./from-docx-itam";
import { TextRun } from "../file";

const formatter = new Formatter();

const SPLIT_TOKEN = "ɵ";

type IReplacerResult = {
    readonly element: Element;
    readonly didFindOccurrence: boolean;
};

export const replacer = ({
    json,
    patch,
    patchText,
    context,
    keepOriginalStyles = true,
}: {
    readonly json: Element;
    readonly patch: IPatch;
    readonly patchText: string;
    readonly context: IContext;
    readonly keepOriginalStyles?: boolean;
}): IReplacerResult => {
    const renderedParagraphs = findLocationOfText(json, patchText);

    if (renderedParagraphs.length === 0) {
        return { element: json, didFindOccurrence: false };
    }

    for (const renderedParagraph of renderedParagraphs) {
        const textJson = patch.children.map((c) => toJson(xml(formatter.format(c as XmlComponent, context)))).map((c) => c.elements![0]);

        switch (patch.type) {
            case PatchType.DOCUMENT: {
                const parentElement = goToParentElementFromPath(json, renderedParagraph.pathToParagraph);
                const elementIndex = getLastElementIndexFromPath(renderedParagraph.pathToParagraph);
                // eslint-disable-next-line functional/immutable-data
                parentElement.elements!.splice(elementIndex, 1, ...textJson);
                break;
            }
            case PatchType.PARAGRAPH:
            default: {
                const paragraphElement = goToElementFromPath(json, renderedParagraph.pathToParagraph);
                replaceTokenInParagraphElement({
                    paragraphElement,
                    renderedParagraph,
                    originalText: patchText,
                    replacementText: SPLIT_TOKEN,
                });

                const index = findRunElementIndexWithToken(paragraphElement, SPLIT_TOKEN);

                const runElementToBeReplaced = paragraphElement.elements![index];
                const { left, right } = splitRunElement(runElementToBeReplaced, SPLIT_TOKEN);

                let newRunElements = textJson;
                let patchedRightElement = right;

                if (keepOriginalStyles) {
                    const runElementNonTextualElements = runElementToBeReplaced.elements!.filter(
                        (e) => e.type === "element" && e.name === "w:rPr",
                    );

                    newRunElements = textJson.map((e) => ({
                        ...e,
                        elements: [...runElementNonTextualElements, ...(e.elements ?? [])],
                    }));

                    patchedRightElement = {
                        ...right,
                        elements: [...runElementNonTextualElements, ...right.elements!],
                    };
                }

                // eslint-disable-next-line functional/immutable-data
                paragraphElement.elements!.splice(index, 1, left, ...newRunElements, patchedRightElement);
                break;
            }
        }
    }

    return { element: json, didFindOccurrence: true };
};


export function underlineReplacer({
    json,
    patchGenerator,
    context,
    keepOriginalStyles = true,
    minUnderlineLength = 2,
}: {
    readonly json: Element;
    readonly patchGenerator: PatchGenerator;
    readonly context: IContext;
    readonly keepOriginalStyles?: boolean;
    readonly minUnderlineLength: number,
}): IReplacerResult {
    const renderedParagraphs = findLocationOfUnderline(json);

    if (renderedParagraphs.length === 0) {
        return { element: json, didFindOccurrence: false };
    }

    for (const renderedParagraph of renderedParagraphs) {
        const { element: paragraphElement, parentRowElement, parentTableElement } = goToElementFromPathAndLocateParentRowWithParentTable(json, renderedParagraph.pathToParagraph);

        const renderedText = renderedParagraph.text as string;

        let underlineTextToReplace: string | null = null;

        for (let i = 0; i < renderedText.length;) {
            let underlineCount = 0;
            while (i + underlineCount < renderedText.length && renderedText[i + underlineCount] === '_') {
                underlineCount += 1;
            }
            if (underlineCount >= minUnderlineLength) {
                underlineTextToReplace = renderedText.substring(i, i + underlineCount);
                break;
            }
            i += underlineCount === 0 ? 1 : underlineCount;
        }

        if (underlineTextToReplace === null) {
            console.log("Underline text was not found in paragraph", renderedText);
            break;
        }

        const patchRef = patchGenerator.nextPatch(underlineTextToReplace);

        patchRef.parentRowElementRef = parentRowElement;
        patchRef.parentTableElementRef = parentTableElement;

        const textJson = patchRef.patch.children.map((c) => toJson(xml(formatter.format(c as XmlComponent, context)))).map((c) => c.elements![0]);

        replaceTokenInParagraphElement({
            paragraphElement,
            renderedParagraph,
            originalText: underlineTextToReplace,
            replacementText: SPLIT_TOKEN,
        });

        const index = findRunElementIndexWithToken(paragraphElement, SPLIT_TOKEN);

        const runElementToBeReplaced = paragraphElement.elements![index];
        const { left, right } = splitRunElement(runElementToBeReplaced, SPLIT_TOKEN);

        let newRunElements = textJson;
        let patchedRightElement = right;

        if (keepOriginalStyles) {
            const runElementNonTextualElements = runElementToBeReplaced.elements!.filter(
                (e) => e.type === "element" && e.name === "w:rPr",
            );

            newRunElements = textJson.map((e) => ({
                ...e,
                elements: [...runElementNonTextualElements, ...(e.elements ?? [])],
            }));

            patchedRightElement = {
                ...right,
                elements: [...runElementNonTextualElements, ...right.elements!],
            };
        }

        // eslint-disable-next-line functional/immutable-data
        paragraphElement.elements!.splice(index, 1, left, ...newRunElements, patchedRightElement);
    }

    return { element: json, didFindOccurrence: true };

}


export type IRowWithRepeat = { textWithinRow: string, timesToRepeatRow: number };

export function copyAppendRowsToTable({ json, rowsWithRepeats }: { json: Element, rowsWithRepeats: IRowWithRepeat[] }): void {
    // copy to prevent changing provided object as while we search we may find same 
    rowsWithRepeats = [...rowsWithRepeats];

    let sumText = "";

    const assembleText = (e: Element): void => {
        if (typeof e.text === 'string') {
            sumText += e.text;
        }
        if (e.elements) {
            for (const c of e.elements) {
                assembleText(c);
            }
        }
    };

    const repeatRowWithTexts = (e: Element): void => {

        if (e.name === "w:tbl" && e.elements) {

            let indexOfRow: number | null = null;
            let repeatToConsider: IRowWithRepeat | null = null;

            for (let i = 0; i < e.elements.length; ++i) {
                if (e.elements[i].name === "w:tr") {
                    sumText = "";
                    assembleText(e.elements[i]);
                    const repeat = rowsWithRepeats.find(r => sumText.includes(r.textWithinRow));
                    if (repeat) {
                        indexOfRow = i;
                        repeatToConsider = repeat;
                        break;
                    }
                }
            }

            if (indexOfRow !== null && repeatToConsider !== null) {
                const newRowElements = [];
                for (let i = 0; i < repeatToConsider.timesToRepeatRow; ++i) {
                    newRowElements.push(structuredClone(e.elements[indexOfRow]));
                }

                e.elements.splice(indexOfRow, 1, ...newRowElements);
                let indexToPop = rowsWithRepeats.indexOf(repeatToConsider);
                rowsWithRepeats.splice(indexToPop, 1);
            }

            return;
        }

        if (e.elements) {
            for (const c of e.elements) {
                repeatRowWithTexts(c);

                if (rowsWithRepeats.length === 0) {
                    return;
                }
            }
        }
    };


    repeatRowWithTexts(json);
}
export function arrayReplacer({
    json,
    patches,
    patchText,
    context,
    keepOriginalStyles = true,
    indexRef,
}: {
    readonly json: Element;
    readonly patches: IPatch[];
    readonly patchText: string,
    readonly context: IContext;
    readonly keepOriginalStyles?: boolean;
    indexRef: { i: number },
}): IReplacerResult {


    const renderedParagraphs = findLocationOfText(json, patchText);

    if (renderedParagraphs.length === 0) {
        return { element: json, didFindOccurrence: false };
    }

    for (const renderedParagraph of renderedParagraphs) {

        const patch = patches[indexRef.i++] ?? { type: PatchType.PARAGRAPH, children: [new TextRun("")] };

        const textJson = patch.children.map((c) => toJson(xml(formatter.format(c as XmlComponent, context)))).map((c) => c.elements![0]);

        switch (patch.type) {
            case PatchType.DOCUMENT: {
                const parentElement = goToParentElementFromPath(json, renderedParagraph.pathToParagraph);
                const elementIndex = getLastElementIndexFromPath(renderedParagraph.pathToParagraph);
                // eslint-disable-next-line functional/immutable-data
                parentElement.elements!.splice(elementIndex, 1, ...textJson);
                break;
            }
            case PatchType.PARAGRAPH:
            default: {
                const paragraphElement = goToElementFromPath(json, renderedParagraph.pathToParagraph);
                replaceTokenInParagraphElement({
                    paragraphElement,
                    renderedParagraph,
                    originalText: patchText,
                    replacementText: SPLIT_TOKEN,
                });

                const index = findRunElementIndexWithToken(paragraphElement, SPLIT_TOKEN);

                const runElementToBeReplaced = paragraphElement.elements![index];
                const { left, right } = splitRunElement(runElementToBeReplaced, SPLIT_TOKEN);

                let newRunElements = textJson;
                let patchedRightElement = right;

                if (keepOriginalStyles) {
                    const runElementNonTextualElements = runElementToBeReplaced.elements!.filter(
                        (e) => e.type === "element" && e.name === "w:rPr",
                    );

                    newRunElements = textJson.map((e) => ({
                        ...e,
                        elements: [...runElementNonTextualElements, ...(e.elements ?? [])],
                    }));

                    patchedRightElement = {
                        ...right,
                        elements: [...runElementNonTextualElements, ...right.elements!],
                    };
                }

                // eslint-disable-next-line functional/immutable-data
                paragraphElement.elements!.splice(index, 1, left, ...newRunElements, patchedRightElement);
                break;
            }
        }
    }

    return { element: json, didFindOccurrence: true };
}





const goToElementFromPath = (json: Element, path: readonly number[]): Element => {
    let element = json;

    // We start from 1 because the first element is the root element
    // Which we do not want to double count
    for (let i = 1; i < path.length; i++) {
        const index = path[i];
        const nextElements = element.elements!;

        element = nextElements[index];
    }

    return element;
};

function goToElementFromPathAndLocateParentRowWithParentTable(json: Element, path: readonly number[]): { element: Element, parentTableElement: Element | null, parentRowElement: Element | null } {
    let element = json;

    // We start from 1 because the first element is the root element
    // Which we do not want to double count

    let parentTableElement: Element | null = null;
    let parentRowElement: Element | null = null;

    for (let i = 1; i < path.length; i++) {
        if (element.name === "w:tr") {
            parentRowElement = element;
        }
        else if (element.name === "w:tbl") {
            parentTableElement = element;
        }

        const index = path[i];
        const nextElements = element.elements!;

        element = nextElements[index];
    }

    return { element, parentTableElement, parentRowElement };
}


const goToParentElementFromPath = (json: Element, path: readonly number[]): Element =>
    goToElementFromPath(json, path.slice(0, path.length - 1));

const getLastElementIndexFromPath = (path: readonly number[]): number => path[path.length - 1];


