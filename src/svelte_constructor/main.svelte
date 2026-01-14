<script module>
</script>

<script>
	import ReferenceField, { fetchDataFromApi } from './referenceField.svelte';

	import Checkbox from './checkbox.svelte';
	import { onWindowClick } from './dropdown.svelte';
	import MyInput from './MyInput.svelte';
	import { onWindowClickToClosePopup } from './PopupBox.svelte';
	import { onEnumerationOptionClick, onSciptedOptionClick, loadExistingTemplate, docxTemplateState } from './script.svelte.js';

	import PopupBox from './PopupBox.svelte';
	import FileZone from './fileZone.svelte';
	import { templateRecordState, fetchColumnRecordsConditionByTableSysId, fetchRelatedListsConditionByTableSysId } from './script.svelte';

	import { setColorForPreviewedDocxField } from './preview_builder.svelte';

	import RenderDocx from './render_docx.svelte';

	let popupBoxRef = $state({});

	async function actionWhenTaskTableSelected({ sys_id: taskTableSysId, name }) {
		if (taskTableSysId === docxTemplateState.dbMappedTaskTable.previous_sys_id) {
			return;
		}

		docxTemplateState.dbMappedTaskTable.previous_sys_id = taskTableSysId;
		docxTemplateState.dbMappedTaskTable.sys_table_name = name;

		docxTemplateState.conditionStringForFields = await fetchColumnRecordsConditionByTableSysId(taskTableSysId);

		docxTemplateState.conditionStringForRelatedLists = await fetchRelatedListsConditionByTableSysId(taskTableSysId);

		docxTemplateState.clearFoundTables();
		docxTemplateState.clearFoundFields();
	}

	async function actionWhenRelatedListSelected(foundTableRef, resp) {
		const { related_table_id: relatedTableSysId, sys_id: uiListSysId, 'related_list_script_id.query_from': relatedTableFromScriptSysId } = resp;

		if (uiListSysId === foundTableRef.dbMappedUiList.previous_sys_id) {
			return;
		}

		foundTableRef.dbMappedUiList.previous_sys_id = uiListSysId;

		foundTableRef.dbMappedUiList.sys_id = uiListSysId;
		foundTableRef.dbMappedUiList.table_id = relatedTableSysId ? relatedTableSysId : relatedTableFromScriptSysId;

		foundTableRef.dbMappedUiList.sys_table_name = (
			await fetchDataFromApi('sys_db_table', `sys_id=${foundTableRef.dbMappedUiList.table_id}`, 'name')
		)[0].display_value;

		for (const foundCol of foundTableRef.foundColumns) {
			foundCol.dbMappedColumn = docxTemplateState._nullMappedColumn();
		}

		if (!relatedTableSysId && !relatedTableFromScriptSysId) {
			return;
		}

		foundTableRef.conditionStringForColumns = await fetchColumnRecordsConditionByTableSysId(relatedTableFromScriptSysId ?? relatedTableSysId);
	}

	async function actionWhenRelatedListColumnSelected({ dbMappedColumn }, { sys_id, column_name: sys_column_name }) {
		if (sys_id === dbMappedColumn.previous_sys_id) {
			return;
		}

		dbMappedColumn.previous_sys_id = sys_id;
		dbMappedColumn.sys_column_name = sys_column_name;
	}

	async function actionWhenTaskFieldSelected(field, { sys_id, column_name: sys_column_name }) {
		const { dbMappedColumn } = field;

		if (sys_id === dbMappedColumn.previous_sys_id) {
			return;
		}

		dbMappedColumn.previous_sys_id = sys_id;
		dbMappedColumn.sys_column_name = sys_column_name;

		setColorForPreviewedDocxField(docxTemplateState.renderRootId, field);
	}
</script>

<svelte:window
	on:click={(event) => {
		onWindowClick(event);
		onWindowClickToClosePopup(event, popupBoxRef);
	}}
/>

<PopupBox {popupBoxRef}></PopupBox>

<RenderDocx></RenderDocx>

<FileZone></FileZone>

<div style="margin-left: 50px;">
	<ReferenceField
		condition=""
		table="itam_task_docx_template"
		fieldTitle="ITAM Docx template to use"
		currentValue={templateRecordState}
		displayByRefColumnName="name"
		{popupBoxRef}
		actionWhenValueSelected={loadExistingTemplate}
	></ReferenceField>
</div>

{#if docxTemplateState.isVisible}
	<div style="margin-top: 50px; grid-column:1/3;" style:display={docxTemplateState.isVisible ? 'unset' : 'none'}>
		<ReferenceField
			table="sys_db_table"
			currentValue={docxTemplateState.dbMappedTaskTable}
			condition={docxTemplateState.conditionStringForTaskTable}
			actionWhenValueSelected={actionWhenTaskTableSelected}
			displayByRefColumnName="title"
			otherColumnsToFetch={['name']}
			{popupBoxRef}
			fieldTitle="ITAM Task table"
		></ReferenceField>
		{#if docxTemplateState.dbMappedTaskTable.sys_id}
			<div style="margin-top: 50px; ">
				{#each docxTemplateState.foundTables as relatedTable}
					<div style="display: flex; flex-direction: column; width: 900px; gap: 30px;">
						<div style="flex: 1 1 auto;">
							<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Field___BH07L" data-test="field-Purchase documentation">
								<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameWrap___STsiA">
									<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Name___fSBsc">
										<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameText___Pc25B" data-test="document_id-label">
											<span class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Label___tjzWY + undefined"
												><span
													>Detected table with following columns:
													{`\n\r\t\t${relatedTable.formedTitleStr}`}
												</span></span
											>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<ReferenceField
						table="sys_ui_related_list_element"
						currentValue={relatedTable.dbMappedUiList}
						actionWhenValueSelected={(newValue) => actionWhenRelatedListSelected(relatedTable, newValue)}
						displayByRefColumnName="title"
						otherColumnsToFetch={['related_table_id', 'related_list_script_id.query_from']}
						condition={docxTemplateState.conditionStringForRelatedLists}
						fieldTitle="Related table"
						{popupBoxRef}
					></ReferenceField>

					<div style="margin-left: 100px;">
						{#if relatedTable.dbMappedUiList.sys_id}
							{#each relatedTable.foundColumns as column}
								<div style="display: flex; flex-direction: row; width: 900px; gap: 50px; align-items: center;">
									<div style="flex: 1 1 auto; max-width: 250px;">
										<div
											class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Field___BH07L"
											data-test="field-Purchase documentation"
										>
											<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameWrap___STsiA">
												<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Name___fSBsc">
													<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameText___Pc25B" data-test="document_id-label">
														<span class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Label___tjzWY + undefined"
															><span>Template field</span></span
														>
													</div>
												</div>
											</div>

											<MyInput binding={column.sourceStr} readonly={true}></MyInput>
										</div>
									</div>

									{#if column.dbMappedColumn.isScripted}
										<ReferenceField
											table="itam_script_table_mapping"
											condition={`table_id=${relatedTable.dbMappedUiList.table_id}`}
											displayByRefColumnName="name"
											fieldTitle="Script mapping"
											currentValue={column.dbMappedColumn}
											otherColumnsToFetch={[]}
											{popupBoxRef}
											isFillWidth={false}
											actionWhenValueSelected={(newValue) => actionWhenRelatedListColumnSelected(column, newValue)}
										></ReferenceField>
									{:else if !column.dbMappedColumn.isEnumerated}
										<ReferenceField
											table="sys_db_column"
											condition={relatedTable.conditionStringForColumns}
											displayByRefColumnName="title"
											fieldTitle="Related list column"
											currentValue={column.dbMappedColumn}
											otherColumnsToFetch={['column_name']}
											actionWhenValueSelected={(newValue) => actionWhenRelatedListColumnSelected(column, newValue)}
											{popupBoxRef}
											isFillWidth={false}
										></ReferenceField>
									{/if}

									<Checkbox
										title="Enumeration column"
										checked={column.dbMappedColumn.isEnumerated}
										onClickCheckbox={() => onEnumerationOptionClick(column)}
									></Checkbox>
									<Checkbox title="Scripted option" checked={column.dbMappedColumn.isScripted} onClickCheckbox={() => onSciptedOptionClick(column)}
									></Checkbox>
								</div>
							{/each}
						{/if}
					</div>

					<div class="black-bar"></div>
				{/each}

				{#each docxTemplateState.foundFields as field}
					<div style="display: flex; flex-direction: row; gap: 50px;">
						<div style="">
							<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Field___BH07L" data-test="field-Purchase documentation">
								<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameWrap___STsiA">
									<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Name___fSBsc">
										<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameText___Pc25B" data-test="document_id-label">
											<span class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Label___tjzWY + undefined"
												><span>Template field</span></span
											>
										</div>
									</div>
								</div>

								<MyInput binding={field.templateStr} readonly={true}></MyInput>
							</div>
						</div>
						<div style="">
							<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Field___BH07L" data-test="field-Purchase documentation">
								<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameWrap___STsiA">
									<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Name___fSBsc">
										<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameText___Pc25B" data-test="document_id-label">
											<span class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Label___tjzWY + undefined"
												><span>Original value</span></span
											>
										</div>
									</div>
								</div>
								<MyInput binding={field.sourceStr} readonly={true}></MyInput>
							</div>
						</div>

						{#if field.dbMappedColumn.isScripted}
							<ReferenceField
								table="itam_script_table_mapping"
								condition={`table_id=${docxTemplateState.dbMappedTaskTable.sys_id}`}
								displayByRefColumnName="name"
								fieldTitle="Script mapping"
								currentValue={field.dbMappedColumn}
								otherColumnsToFetch={[]}
								{popupBoxRef}
								isFillWidth={false}
								actionWhenValueSelected={(newValue) => actionWhenTaskFieldSelected(field, newValue)}
							></ReferenceField>
						{:else}
							<ReferenceField
								fieldTitle="Task table to map"
								table="sys_db_column"
								condition={docxTemplateState.conditionStringForFields}
								currentValue={field.dbMappedColumn}
								displayByRefColumnName="title"
								{popupBoxRef}
								otherColumnsToFetch={['column_name']}
								actionWhenValueSelected={(newValue) => actionWhenTaskFieldSelected(field, newValue)}
								isFillWidth={false}
							></ReferenceField>
						{/if}

						<Checkbox title="Scripted option" onClickCheckbox={() => onSciptedOptionClick(field)} checked={field.dbMappedColumn.isScripted}
						></Checkbox>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.black-bar {
		background-color: #000000; /* Use the hex code for black */
		height: 1px; /* Set a specific height */
		width: 100%;
		margin-bottom: 30px;
	}
</style>
