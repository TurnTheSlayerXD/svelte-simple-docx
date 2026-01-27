
window.s_widget_custom = window.s_widget_custom || {};

(async function main() {
    s_widget.setFieldValue('currentTableName', s_form.getTableName());
    await serverUpdate('init');
})();

s_widget_custom.onGenerateButtonClick = async () => {
    s_widget.setFieldValue('isGenerateButtonDisabled', true);
    s_widget.setFieldValue('isReferenceFieldReadOnly', true);
    await doGenerationAlgorithm();
    s_widget.setFieldValue('isGenerateButtonDisabled', false);
    s_widget.setFieldValue('isReferenceFieldReadOnly', false);
};

s_widget_custom.onReferenceChange = () => {
    const currentTemplate = s_widget.getFieldValue('currentTemplate');
    s_widget.setFieldValue('isGenerateButtonDisabled', !!(currentTemplate?.database_value) ? false : true);
};

async function serverUpdate(action) {
    s_widget.setFieldValue('action', action);
    await s_widget.serverUpdate();
    s_widget.setFieldValue('action', '');
}

async function doGenerationAlgorithm() {
    const TEMPLATE_RECORD_ID = s_widget.getFieldValue('currentTemplate').database_value;
    const TEMPLATE_TABLE_ID = '176580796911236520';

    const [base64, templateRecord, docxScriptText] = await Promise.all([
        new Promise(async (resolve) => {
            const simpleAjax = new SimpleAjax();
            await simpleAjax.runAdminScript(
                `
                    const docId = ss.getDocIdByIds('${TEMPLATE_TABLE_ID}', '${TEMPLATE_RECORD_ID}');
                    const attachmentSr = new SimpleRecord('sys_attachment');
                    attachmentSr.addQuery('record_document_id', docId);
                    attachmentSr.selectAttributes('sys_id');
                    attachmentSr.setLimit(1);
                    attachmentSr.query();
                    attachmentSr.next();
                    const read = new SimpleAttachment();
                    setResult(read.readBase64(attachmentSr.sys_id));
                `,
                null,
                (response) => {
                    resolve(response.data.result);
                }
            );
        }),
        new Promise(resolve => {
            const record = new SimpleRecord('itam_task_docx_template');
            record.get(TEMPLATE_RECORD_ID, () => {
                resolve(JSON.parse(record.template_data));
            });
        }),
        fetch('/rest/v1/table/sys_script/176538018815432077?sysparm_exclude_reference_link=1', {
            headers: {
                'Authorization': `Bearer ${s_user.accessToken}`,
            },
        }).then(r => r.json()).then(json => json.data[0].script),
    ]);


    s_widget.setFieldValue("templateSysId", TEMPLATE_RECORD_ID);
    s_widget.setFieldValue("recordSysIdToSearchDataFrom", s_form.getUniqueValue());
    s_widget.setFieldValue("recordTableName", s_form.getTableName());

    await Promise.all([
        new Promise((resolve) => setTimeout(() => { eval(docxScriptText); resolve(true); }, 10)),
        serverUpdate("fetchTableData"),
    ]);

    const patches = s_widget.getFieldValue("resultData");
    s_widget.setFieldValue("resultData", undefined);
    s_widget.setFieldValue("templateSysId", undefined);
    s_widget.setFieldValue("recordSysIdToSearchDataFrom", undefined);
    s_widget.setFieldValue("recordTableName", undefined);

    console.log(JSON.parse(JSON.stringify(patches)));
    const arrayBuffer = base64DecodeIntoArrayBuffer(base64);
    const outputBlob = await docx.ITAM_replaceTemplateFieldsInDocxAndGetOutputBuffer(patches, new Blob([arrayBuffer]));

    const url = URL.createObjectURL(outputBlob);

    const a = document.createElement("a");
    a.download = `${s_form.getUniqueValue()}_template.docx`;
    a.href = url;
    a.click();
}

function base64DecodeIntoArrayBuffer(base64) {
    const bytes = [];
    const decodedStr = window.atob(base64);
    for (let i = 0; i < decodedStr.length; ++i) {
        bytes.push(decodedStr.charCodeAt(i));
    }
    return new Uint8Array(bytes);
}

