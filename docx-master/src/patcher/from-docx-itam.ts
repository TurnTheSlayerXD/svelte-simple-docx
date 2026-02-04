
import JSZip from "jszip";

import { Element } from "xml-js";

import { DocumentAttributeNamespaces } from "@file/document";
import { IViewWrapper } from "@file/document-wrapper";
import { File } from "@file/file";
import { Media } from "@file/media";
import { TextRun } from "@file/paragraph";
import { TargetModeType } from "@file/relationships/relationship/relationship";
import { IContext } from "@file/xml-components";
import { OutputByType } from "@util/output-type";

import { appendContentType } from "./content-types-manager";
import { appendRelationship, getNextRelationshipIndex } from "./relationship-manager";
import { toJson } from "./util";
import { compareByteArrays, createRelationshipFile, IHyperlinkRelationshipAddition, IImageRelationshipAddition, imageReplacer, InputDataType, IPatch, patchDocument, PatchDocumentOutputType, PatchType, toXml, UTF16BE, UTF16LE } from "./from-docx";
import { arrayReplacer, copyAppendRowsToTable, IRowWithRepeat, underlineReplacer } from "./replacer";

// eslint-disable-next-line functional/prefer-readonly-type

export type RegexPatchDocumentOptions<T extends PatchDocumentOutputType = PatchDocumentOutputType> = {
    readonly outputType: T;
    readonly data: InputDataType;
    readonly patchGenerator: PatchGenerator;
    readonly keepOriginalStyles?: boolean;
    readonly recursion?: { is_recursive: false } | { is_recursive: true, max_recursion: number };
};

export const regexPatchDocument = async <T extends PatchDocumentOutputType = PatchDocumentOutputType>({
    outputType,
    data,
    patchGenerator,
    keepOriginalStyles,
    recursion,
}: RegexPatchDocumentOptions<T>): Promise<OutputByType[T]> => {
    // console.log("JSZip", JSZip);
    const zipContent = data instanceof JSZip ? data : await JSZip.loadAsync(data);

    const contexts = new Map<string, IContext>();
    const file = {
        Media: new Media(),
    } as unknown as File;

    const map = new Map<string, Element>();

    // eslint-disable-next-line functional/prefer-readonly-type
    const imageRelationshipAdditions: IImageRelationshipAddition[] = [];
    // eslint-disable-next-line functional/prefer-readonly-type
    const hyperlinkRelationshipAdditions: IHyperlinkRelationshipAddition[] = [];
    let hasMedia = false;

    const binaryContentMap = new Map<string, Uint8Array>();


    for (const [key, value] of Object.entries(zipContent.files)) {
        const binaryValue = await value.async("uint8array");
        const startBytes = binaryValue.slice(0, 2);
        if (compareByteArrays(startBytes, UTF16LE) || compareByteArrays(startBytes, UTF16BE)) {
            binaryContentMap.set(key, binaryValue);
            continue;
        }

        if (!key.endsWith(".xml") && !key.endsWith(".rels")) {
            binaryContentMap.set(key, binaryValue);
            continue;
        }
        const json = toJson(await value.async("text"));

        if (key === "word/document.xml") {
            const document = json.elements?.find((i) => i.name === "w:document");
            if (document && document.attributes) {
                // We could check all namespaces from Document, but we'll instead
                // check only those that may be used by our element types.

                for (const ns of ["mc", "wp", "r", "w15", "m"] as const) {
                    // eslint-disable-next-line functional/immutable-data
                    document.attributes[`xmlns:${ns}`] = DocumentAttributeNamespaces[ns];
                }
                // eslint-disable-next-line functional/immutable-data
                document.attributes["mc:Ignorable"] = `${document.attributes["mc:Ignorable"] || ""} w15`.trim();
            }
        }

        if (key.startsWith("word/") && !key.endsWith(".xml.rels")) {
            const context: IContext = {
                file,
                viewWrapper: {
                    Relationships: {
                        createRelationship: (
                            linkId: string,
                            _: string,
                            target: string,
                            __: (typeof TargetModeType)[keyof typeof TargetModeType],
                        ) => {
                            // eslint-disable-next-line functional/immutable-data
                            hyperlinkRelationshipAdditions.push({
                                key,
                                hyperlink: {
                                    id: linkId,
                                    link: target,
                                },
                            });
                        },
                    },
                } as unknown as IViewWrapper,
                stack: [],
            };
            contexts.set(key, context);


            let recursionCount = 0;
            while (true) {

                const { didFindOccurrence } = underlineReplacer({
                    json,
                    patchGenerator,
                    context,
                    keepOriginalStyles,
                    minUnderlineLength: 2,
                });
                // What the reason doing that? Once document is patched - it search over patched json again, that takes too long if patched document has big and deep structure.
                if (!recursion?.is_recursive || recursionCount > recursion.max_recursion || !didFindOccurrence) {
                    break;
                }

                recursionCount += 1;
            }

            const mediaDatas = imageReplacer.getMediaData(JSON.stringify(json), context.file.Media);
            if (mediaDatas.length > 0) {
                hasMedia = true;
                // eslint-disable-next-line functional/immutable-data
                imageRelationshipAdditions.push({
                    key,
                    mediaDatas,
                });
            }
        }
        map.set(key, json);
    }

    for (const { key, mediaDatas } of imageRelationshipAdditions) {
        // eslint-disable-next-line functional/immutable-data
        const relationshipKey = `word/_rels/${key.split("/").pop()}.rels`;
        const relationshipsJson = map.get(relationshipKey) ?? createRelationshipFile();
        map.set(relationshipKey, relationshipsJson);

        const index = getNextRelationshipIndex(relationshipsJson);
        const newJson = imageReplacer.replace(JSON.stringify(map.get(key)), mediaDatas, index);
        map.set(key, JSON.parse(newJson) as Element);

        for (let i = 0; i < mediaDatas.length; i++) {
            const { fileName } = mediaDatas[i];
            appendRelationship(
                relationshipsJson,
                index + i,
                "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
                `media/${fileName}`,
            );
        }
    }

    for (const { key, hyperlink } of hyperlinkRelationshipAdditions) {
        // eslint-disable-next-line functional/immutable-data
        const relationshipKey = `word/_rels/${key.split("/").pop()}.rels`;

        const relationshipsJson = map.get(relationshipKey) ?? createRelationshipFile();
        map.set(relationshipKey, relationshipsJson);

        appendRelationship(
            relationshipsJson,
            hyperlink.id,
            "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
            hyperlink.link,
            TargetModeType.EXTERNAL,
        );
    }

    if (hasMedia) {
        const contentTypesJson = map.get("[Content_Types].xml");

        if (!contentTypesJson) {
            throw new Error("Could not find content types file");
        }

        appendContentType(contentTypesJson, "image/png", "png");
        appendContentType(contentTypesJson, "image/jpeg", "jpeg");
        appendContentType(contentTypesJson, "image/jpeg", "jpg");
        appendContentType(contentTypesJson, "image/bmp", "bmp");
        appendContentType(contentTypesJson, "image/gif", "gif");
        appendContentType(contentTypesJson, "image/svg+xml", "svg");
    }

    const zip = new JSZip();

    for (const [key, value] of map) {
        const output = toXml(value);

        zip.file(key, output);
    }

    for (const [key, value] of binaryContentMap) {
        zip.file(key, value);
    }

    for (const { data: stream, fileName } of file.Media.Array) {
        zip.file(`word/media/${fileName}`, stream);
    }

    const res = await zip.generateAsync({
        type: outputType,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        compression: "DEFLATE",
    });

    return res;
};

export type PatchGeneratorReturnType = { patch: IPatch, parentTableElementRef: Element | null, parentRowElementRef: Element | null, patchString: string, sourceString: string };
export class PatchGenerator {

    private i: number;
    public createdPatches: PatchGeneratorReturnType[];

    constructor() {
        this.i = 0;
        this.createdPatches = [];
    }

    nextPatch(sourceString: string): PatchGeneratorReturnType {
        const newPatchStr = `{{field_${this.i++}}}`;
        const createdPatch: PatchGeneratorReturnType = {
            patch: { type: PatchType.PARAGRAPH, children: [new TextRun(newPatchStr)] },
            parentTableElementRef: null,
            parentRowElementRef: null,
            patchString: newPatchStr,
            sourceString,
        };
        this.createdPatches.push(createdPatch);
        return createdPatch;
    }
}

export type ProcessingTemplateResult = {
    sourceString: string,
    replacementString: string,

    isInsideRow: false,
} | {
    sourceString: string,
    replacementString: string,

    isInsideRow: true,
    rowGroupId: number,
};

export async function ITAM_processFileAndFindPlacesToReplace(blob: any): Promise<any> {

    try {
        const patchGenerator = new PatchGenerator();
        const outputBlob = await regexPatchDocument(
            {
                outputType: "nodebuffer",
                data: blob,
                patchGenerator,
                recursion: { is_recursive: true, max_recursion: 100 },
                keepOriginalStyles: true,
            }
        );

        let groups: PatchGeneratorReturnType[][] = [];

        for (const patch of patchGenerator.createdPatches) {
            const existingGroup = groups.find(g => g.length > 0 && g[0].parentRowElementRef === patch.parentRowElementRef);
            if (!existingGroup) {
                groups.push([patch]);
            }
            else {
                existingGroup.push(patch);
            }
        }

        const patches: ProcessingTemplateResult[] = groups
            .flatMap((group, groupIndex) => group
                .map(t => {
                    if (t.parentRowElementRef) {
                        return {
                            sourceString: t.sourceString,
                            replacementString: t.patchString,
                            isInsideRow: true,
                            rowGroupId: groupIndex,
                        }
                    }
                    return { sourceString: t.sourceString, replacementString: t.patchString, isInsideRow: false };
                }));

        console.log(groups);

        return [outputBlob, patches];
    } catch (err) {
        console.error(err);
        return err;
    }
}

export type TypeToReplaceTemplates = {
    templateString: string, replacementData:
    { isRowData: false, replacementString: string } | { isRowData: true, replacements: string[], rowGroupId: number }
};

export async function ITAM_replaceTemplateFieldsInDocxAndGetOutputBuffer(patches: TypeToReplaceTemplates[], inputArrayBuffer: any): Promise<any> {

    try {
        const rowPatches = patches
            .map(t => t.replacementData.isRowData ?
                ({
                    templateString: t.templateString,
                    groupId: t.replacementData.rowGroupId,
                    replacementsLength: t.replacementData.replacements.length,
                    replacements: t.replacementData.replacements
                })
                : undefined)
            .filter(t => t !== undefined) as unknown as {
                templateString: string;
                groupId: number;
                replacementsLength: number;
                replacements: string[];
            }[];

        const appendRowsCallback = (json: Element, context: IContext): void => {
            const groups = new Map<number, IRowWithRepeat>();
            for (const { groupId, replacementsLength, templateString } of rowPatches) {
                if (!groups.has(groupId)) {
                    groups.set(groupId, { timesToRepeatRow: replacementsLength, textWithinRow: templateString });
                }
                if (replacementsLength > groups.get(groupId)!.timesToRepeatRow) {
                    groups.set(groupId, { timesToRepeatRow: replacementsLength, textWithinRow: templateString });
                }
            }

            copyAppendRowsToTable({ json, rowsWithRepeats: [...groups.values()] });
        };

        const replaceRowDataCallback = (json: Element, context: IContext) => {
            const replacementCycle = (patchText: string, patchValues: IPatch[]) => {
                const indexRef = { i: 0 };
                while (true) {
                    const { didFindOccurrence } = arrayReplacer({
                        json,
                        patches: patchValues,
                        patchText: patchText,
                        context,
                        keepOriginalStyles: true,
                        indexRef,
                    });
                    // What the reason doing that? Once document is patched - it search over patched json again, that takes too long if patched document has big and deep structure.
                    if (!didFindOccurrence) {
                        break;
                    }
                }
            };

            for (const { templateString, replacements } of rowPatches) {
                const patches = replacements.map(t => ({ type: PatchType.PARAGRAPH, children: [new TextRun(t)] }));
                replacementCycle(templateString, patches);
            }
        };

        const notRowPatches: Record<string, IPatch> = {};
        for (const p of patches) {
            if (!p.replacementData.isRowData) {
                notRowPatches[p.templateString] = { type: PatchType.PARAGRAPH, children: [new TextRun(p.replacementData.replacementString)] };
            }
        }
        const output = await patchDocument(
            { outputType: "nodebuffer", data: inputArrayBuffer, patches: notRowPatches, keepOriginalStyles: true, recursive: true },
            [appendRowsCallback, replaceRowDataCallback]);
        return output;
    }
    catch (err) {
        return err;
    }
}

