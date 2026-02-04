
import JSZip from "../../jszip-main/dist";

import { Element, js2xml } from "xml-js";

import { ImageReplacer } from "@export/packer/image-replacer";
import { DocumentAttributeNamespaces } from "@file/document";
import { IViewWrapper } from "@file/document-wrapper";
import { File } from "@file/file";
import { FileChild } from "@file/file-child";
import { IMediaData, Media } from "@file/media";
import { ParagraphChild, TextRun } from "@file/paragraph";
import { TargetModeType } from "@file/relationships/relationship/relationship";
import { IContext } from "@file/xml-components";
import { OutputByType, OutputType } from "@util/output-type";

import { appendContentType } from "./content-types-manager";
import { appendRelationship, getNextRelationshipIndex } from "./relationship-manager";
import { copyAppendRowsToTable, RegexReplacer, replacerByArray } from "./replacer";
import { toJson } from "./util";
import { patchDocument } from "./from-docx";

// eslint-disable-next-line functional/prefer-readonly-type
type InputDataType = Buffer | string | number[] | Uint8Array | ArrayBuffer | Blob | NodeJS.ReadableStream;

const PatchType = {
    DOCUMENT: "file",
    PARAGRAPH: "paragraph",
} as const;

type ParagraphPatch = {
    readonly type: typeof PatchType.PARAGRAPH;
    readonly children: readonly ParagraphChild[];
};

type FilePatch = {
    readonly type: typeof PatchType.DOCUMENT;
    readonly children: readonly FileChild[];
};

type IImageRelationshipAddition = {
    readonly key: string;
    readonly mediaDatas: readonly IMediaData[];

};
type IHyperlinkRelationshipAddition = {
    readonly key: string;
    readonly hyperlink: { readonly id: string; readonly link: string };
};

type IPatch = ParagraphPatch | FilePatch;

type PatchDocumentOutputType = OutputType;

export type RegexPatchDocumentOptions<T extends PatchDocumentOutputType = PatchDocumentOutputType> = {
    readonly outputType: T;
    readonly data: InputDataType;
    readonly patchGenerator: PatchGenerator;
    readonly keepOriginalStyles?: boolean;
    readonly placeholderDelimiters: Readonly<{ regex: RegExp, regexReplacer: RegexReplacer }>;
    readonly recursive?: boolean;
};

const imageReplacer = new ImageReplacer();
const UTF16LE = new Uint8Array([0xff, 0xfe]);
const UTF16BE = new Uint8Array([0xfe, 0xff]);

const compareByteArrays = (a: Uint8Array, b: Uint8Array): boolean => {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
};

export const regexPatchDocument = async <T extends PatchDocumentOutputType = PatchDocumentOutputType>({
    outputType,
    data,
    patchGenerator,
    keepOriginalStyles,
    placeholderDelimiters,
    recursive = true,
}: RegexPatchDocumentOptions<T>): Promise<OutputByType[T]> => {
    console.log("JSZip", JSZip);
    const zipContent = await JSZip.loadAsync(data);

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



            const cycleMany = (regex: RegExp, regexReplacer: RegexReplacer, patchGenerator: PatchGenerator) => {
                while (true) {
                    const { didFindOccurrence } = regexReplacer.doReplace({
                        json,
                        patchGenerator,
                        patchRegex: regex,
                        context,
                        keepOriginalStyles,
                    });
                    // What the reason doing that? Once document is patched - it search over patched json again, that takes too long if patched document has big and deep structure.
                    if (!recursive || !didFindOccurrence) {
                        break;
                    }
                }
            };

            cycleMany(
                placeholderDelimiters.regex,
                placeholderDelimiters.regexReplacer,
                patchGenerator);

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

const toXml = (jsonObj: Element): string => {
    const output = js2xml(jsonObj, {
        attributeValueFn: (str) =>
            String(str)
                .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&apos;"), // cspell:words apos
    });
    return output;
};

const createRelationshipFile = (): Element => ({
    declaration: {
        attributes: {
            version: "1.0",
            encoding: "UTF-8",
            standalone: "yes",
        },
    },
    elements: [
        {
            type: "element",
            name: "Relationships",
            attributes: {
                xmlns: "http://schemas.openxmlformats.org/package/2006/relationships",
            },
            elements: [],
        },
    ],
});



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
        const regexReplacer = new RegexReplacer();
        const patchGenerator = new PatchGenerator();
        const outputBlob = await regexPatchDocument(
            {
                outputType: "nodebuffer",
                data: blob,
                patchGenerator,
                placeholderDelimiters: { regex: /_{2,}/g, regexReplacer },
                recursive: true,
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

            const groups = new Map<number, { replacementsLength: number, templateString: string }>();
            for (const { groupId, replacementsLength, templateString } of rowPatches) {
                if (!groups.has(groupId)) {
                    groups.set(groupId, { replacementsLength, templateString });
                }
                if (replacementsLength > groups.get(groupId)!.replacementsLength) {
                    groups.set(groupId, { replacementsLength, templateString });
                }
            }

            for (const { replacementsLength, templateString } of groups.values()) {
                copyAppendRowsToTable({ json, textWithinRow: templateString, rowsRepeatedCount: replacementsLength });
            }
        };

        const replaceRowDataCallback = (json: Element, context: IContext) => {
            const replacementCycle = (patchText: string, patchValues: IPatch[]) => {

                const indexRef = { i: 0 };
                while (true) {
                    const { didFindOccurrence } = replacerByArray({
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
            { outputType: "blob", data: inputArrayBuffer, patches: notRowPatches, keepOriginalStyles: true, recursive: true },
            [appendRowsCallback, replaceRowDataCallback]);
        return output;
    }
    catch (err) {
        return err;
    }
}

