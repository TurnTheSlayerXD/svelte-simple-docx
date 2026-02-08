import { ITAM_processFileAndFindPlacesToReplace, ITAM_replaceTemplateFieldsInDocxAndGetOutputBuffer, TypeToReplaceTemplates } from "./src/patcher/from-docx-itam";

import { readFileSync, writeFileSync } from "fs";

// const in_filename = "test.docx";

// const in_data = readFileSync(in_filename).buffer;

// ITAM_processFileAndFindPlacesToReplace(in_data).then(([out_data, patches]) => {
//     writeFileSync("out_" + in_filename, out_data);
// });


const in_filename = "out_test.docx";

const in_data = readFileSync(in_filename);

const patches: TypeToReplaceTemplates[] = [
    { templateString: "{{field_2}}", replacementData: { isRowData: false, replacementString: "hello" } },
    { templateString: "{{field_4}}", replacementData: { isRowData: true, replacements: ["1", "2", "3", "4", "5"], rowGroupId: 0 } },
    { templateString: "{{field_16}}", replacementData: { isRowData: true, replacements: ["a", "b", "c"], rowGroupId: 1 } },
];

let res = ITAM_replaceTemplateFieldsInDocxAndGetOutputBuffer(patches, in_data);
console.log("ok");
writeFileSync("filled_" + in_filename, res);

