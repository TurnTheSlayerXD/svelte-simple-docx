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
	import {
		templateRecordState,
		fetchColumnRecordsConditionByTableSysId,
		fetchRelatedListsConditionByTableSysId,
		generateTemplate
	} from './script.svelte';

	import { setPreviewedDocxField } from './preview_builder.svelte';

	import RenderDocx from './render_docx.svelte';

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

		setPreviewedDocxField(docxTemplateState.renderRootId, field);
	}

	let popupBoxRef = $state({});

	let sidebarPopupBoxRef = $state({});

	let isDocxTemplateSelected = $derived(!!templateRecordState.sys_id || !!docxFiles.templateDocx);
	let isSidebarVisible = $derived(isDocxTemplateSelected);

	const outerContainerHook = document.getElementById('outer-container');
	let simpleHeaderHeight = $state(0);
	simpleHeaderHeight = document.querySelector('#root > span > div > header').getBoundingClientRect().height;

	outerContainerHook.style.height = `calc(100vh - ${simpleHeaderHeight}px)`;
	let sidebarHook = $state();

	let docxFiles = $state({
		sourceDocx: null,
		templateDocx: null
	});

	let resizeHelperHook = $state();

	let sidebarScrollHook = $state();

	window.onPreviewInputFocus = (fieldTemplateStr) => {
		const fieldRef = docxTemplateState.foundFields.find((field) => field.templateStr === fieldTemplateStr);
		if (!fieldRef) {
			throw new Error('const fieldRef = docxTemplateState.foundFields.find(field => field.templateStr === fieldTemplateStr);');
		}
		const { previewField, htmlHook } = fieldRef;

		sidebarScrollHook.scrollBy(0, htmlHook.getBoundingClientRect().top - document.body.offsetHeight / 2);

		fieldRef.isFocused = true;
		setTimeout(() => {
			fieldRef.isFocused = false;
		}, 1000);
	};

	// window.onPreviewButtonClick = (fieldTemplateStr) => {
	// 	const fieldRef = docxTemplateState.foundFields.find((field) => field.templateStr === fieldTemplateStr);
	// 	if (!fieldRef) {
	// 		throw new Error('const fieldRef = docxTemplateState.foundFields.find(field => field.templateStr === fieldTemplateStr);');
	// 	}
	// 	const { previewField, htmlHook } = fieldRef;

	// 	sidebarScrollHook.scrollBy(0, htmlHook.getBoundingClientRect().top - document.body.offsetHeight / 2);

	// 	fieldRef.isFocused = true;

	// 	setTimeout(() => {
	// 		fieldRef.isFocused = false;
	// 	}, 1000);
	// };
</script>

<svelte:window
	on:click={(event) => {
		onWindowClick(event);
		onWindowClickToClosePopup(event, popupBoxRef);
		onWindowClickToClosePopup(event, sidebarPopupBoxRef);
	}}
/>

{#if !isDocxTemplateSelected}
	<div style="margin-left: 100px; margin-top: 100px;">
		<FileZone {docxFiles}></FileZone>
	</div>
{/if}

{#if !isDocxTemplateSelected}
	<div style="margin-left: 100px; margin-top: 100px;">
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
{/if}

<div style:display={isDocxTemplateSelected ? 'unset' : 'none'}>
	<RenderDocx {docxTemplateState}></RenderDocx>
</div>

<PopupBox {popupBoxRef}></PopupBox>

{#if isDocxTemplateSelected}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		style="position: fixed; right: 0;"
		style:display={docxTemplateState.isVisible ? 'none' : 'unset'}
		style:top={simpleHeaderHeight + 'px'}
		onclick={() => {
			docxTemplateState.isVisible = !docxTemplateState.isVisible;
		}}
		class="src-components-uiButtons-___styles-module__uiButton___VXfKK"
	>
		<div>
			<button class="src-components-button-___styles-module__Default___Lp0Il" type="button"> Open sidebar </button>
		</div>
	</div>

	<div
		class="sidebar-container"
		style:top={simpleHeaderHeight + 'px'}
		style:height={`calc(100vh - ${simpleHeaderHeight}px)`}
		bind:this={sidebarHook}
		style:display={docxTemplateState.isVisible ? 'unset' : 'none'}
		draggable="false"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->

		<div
			class="sidebar-resize-helper"
			bind:this={resizeHelperHook}
			onpointerdown={(ev) => {
				const elResizer = ev.target.closest('.sidebar-resize-helper');
				if (!elResizer) {
					return;
				}
				elResizer.setPointerCapture(ev.pointerId);
			}}
			onpointermove={(ev) => {
				const elResizer = ev.target;
				if (!elResizer.hasPointerCapture(ev.pointerId)) {
					return;
				}
				const { width: currentWidth } = sidebarHook.getBoundingClientRect();
				sidebarHook.style.width = `${currentWidth - ev.movementX}px`;
			}}
		></div>

		<div class="sidebar-inner" bind:this={sidebarScrollHook}>
			<PopupBox popupBoxRef={sidebarPopupBoxRef}></PopupBox>

			<div class="sidebar-header">
				<!-- svelte-ignore a11y_consider_explicit_label -->
				<button
					class="src-components-button-___styles-module__Default___Lp0Il src-components-button-___styles-module__Icon___gxSRu src-components-modalWindow-___styles-module__CloseIco___xiEBF"
					type="button"
					onclick={() => {
						docxTemplateState.isVisible = !docxTemplateState.isVisible;
					}}
					><span
						><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class=""
							><path
								d="M19.6653 5.95098C20.1116 5.50467 20.1116 4.78105 19.6653 4.33473C19.219 3.88842 18.4953 3.88842 18.049 4.33473L12 10.3838L5.95098 4.33473C5.50467 3.88842 4.78105 3.88842 4.33473 4.33473C3.88842 4.78105 3.88842 5.50467 4.33473 5.95098L10.3838 12L4.33473 18.049C3.88842 18.4953 3.88842 19.219 4.33473 19.6653C4.78105 20.1116 5.50467 20.1116 5.95098 19.6653L12 13.6162L18.049 19.6653C18.4953 20.1116 19.219 20.1116 19.6653 19.6653C20.1116 19.219 20.1116 18.4953 19.6653 18.049L13.6162 12L19.6653 5.95098Z"
								fill="#2E3238"
								class=""
							></path></svg
						></span
					></button
				>

				<ReferenceField
					table="sys_db_table"
					currentValue={docxTemplateState.dbMappedTaskTable}
					condition={docxTemplateState.conditionStringForTaskTable}
					actionWhenValueSelected={actionWhenTaskTableSelected}
					displayByRefColumnName="title"
					otherColumnsToFetch={['name']}
					popupBoxRef={sidebarPopupBoxRef}
					fieldTitle="ITAM Task table"
				></ReferenceField>

				{#if !templateRecordState.sys_id}
					<button class="src-components-button-___styles-module__Default___Lp0Il" onclick={() => generateTemplate(docxFiles)}>
						Generate template
					</button>
				{:else}
					<button class="src-components-button-___styles-module__Default___Lp0Il process-file__button" onclick={() => generateTemplate()}>
						Update template
					</button>
				{/if}
				<button
					class="src-components-button-___styles-module__Default___Lp0Il"
					onclick={() => {
						docxFiles.sourceDocx = null;
						docxFiles.templateDocx = null;
						docxTemplateState.renderRootId = null;
						docxTemplateState.clearAll();
						docxTemplateState.isVisible = false;
						templateRecordState.reset();
					}}
				>
					Restart
				</button>
			</div>

			{#if docxTemplateState.dbMappedTaskTable.sys_id}
				<div class="sidebar-body">
					{#each docxTemplateState.foundTables as relatedTable}
						<div class="related-table-title">
							<div style="flex: 1 1 auto;">
								<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Field___BH07L" data-test="field-Purchase documentation">
									<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameWrap___STsiA">
										<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Name___fSBsc">
											<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameText___Pc25B" data-test="document_id-label">
												<span class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Label___tjzWY + undefined"
													><span
														>Detected table with following columns:
														{relatedTable.formedTitleStr}
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
							popupBoxRef={sidebarPopupBoxRef}
						></ReferenceField>

						<div style="margin-left: 30px;">
							{#if relatedTable.dbMappedUiList.sys_id}
								{#each relatedTable.foundColumns as column}
									<div style="display: flex; flex-direction: row; width: 900px; gap: 30px; align-items: center;">
										<div style="flex: 1 1 auto; max-width: 150px;">
											<div
												class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Field___BH07L"
												data-test="field-Purchase documentation"
											>
												<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameWrap___STsiA">
													<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Name___fSBsc">
														<div
															class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameText___Pc25B"
															data-test="document_id-label"
														>
															<span class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Label___tjzWY + undefined"
																><span>Template field</span></span
															>
														</div>
													</div>
												</div>

												<MyInput binding={column.sourceStr} readonly={true}></MyInput>
											</div>
										</div>

										<div style="max-width: 200px; width: -webkit-fill-available;">
											{#if column.dbMappedColumn.isScripted}
												<ReferenceField
													table="itam_script_table_mapping"
													condition={`table_id=${relatedTable.dbMappedUiList.table_id}`}
													displayByRefColumnName="name"
													fieldTitle="Script mapping"
													currentValue={column.dbMappedColumn}
													otherColumnsToFetch={[]}
													popupBoxRef={sidebarPopupBoxRef}
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
													popupBoxRef={sidebarPopupBoxRef}
													isFillWidth={false}
												></ReferenceField>
											{/if}
										</div>

										<div style="max-width: 150px; width: -webkit-fill-available;">
											<Checkbox
												title="Enumeration column"
												checked={column.dbMappedColumn.isEnumerated}
												onClickCheckbox={() => onEnumerationOptionClick(column)}
											></Checkbox>
										</div>
										<div style="max-width: 150px; width: -webkit-fill-available;">
											<Checkbox
												title="Scripted option"
												checked={column.dbMappedColumn.isScripted}
												onClickCheckbox={() => onSciptedOptionClick(column)}
											></Checkbox>
										</div>
									</div>
								{/each}
							{/if}
						</div>

						<div class="black-bar"></div>
					{/each}

					{#each docxTemplateState.foundFields as field}
						<div class="docx-field-row" bind:this={field.htmlHook} style:background={field.isFocused ? '#e5f4ff' : 'unset'}>
							<!-- <div style="">
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
							</div> -->

							<div style="max-width: 250px; width: -webkit-fill-available;">
								{#if field.dbMappedColumn.isScripted}
									<ReferenceField
										table="itam_script_table_mapping"
										condition={`table_id=${docxTemplateState.dbMappedTaskTable.sys_id}`}
										displayByRefColumnName="name"
										fieldTitle="Script mapping"
										currentValue={field.dbMappedColumn}
										otherColumnsToFetch={[]}
										popupBoxRef={sidebarPopupBoxRef}
										isFillWidth={false}
										actionWhenValueSelected={(newValue) => actionWhenTaskFieldSelected(field, newValue)}
									></ReferenceField>
								{:else}
									<ReferenceField
										fieldTitle="Task column to map"
										table="sys_db_column"
										condition={docxTemplateState.conditionStringForFields}
										currentValue={field.dbMappedColumn}
										displayByRefColumnName="title"
										popupBoxRef={sidebarPopupBoxRef}
										otherColumnsToFetch={['column_name']}
										actionWhenValueSelected={(newValue) => actionWhenTaskFieldSelected(field, newValue)}
										isFillWidth={false}
									></ReferenceField>
								{/if}
							</div>
							<div style="max-width: 200px; width: -webkit-fill-available;">
								<Checkbox title="Scripted option" onClickCheckbox={() => onSciptedOptionClick(field)} checked={field.dbMappedColumn.isScripted}
								></Checkbox>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.black-bar {
		background-color: #000000; /* Use the hex code for black */
		height: 1px; /* Set a specific height */
		width: 100%;
		margin-bottom: 30px;
	}

	.sidebar-container {
		position: absolute;
		top: 0;
		right: 0;
		width: 600px;
		max-width: 900px;
		min-width: 550px;

		box-shadow:
			0px 4px 6px rgba(0, 0, 0, 0.1),
			0px 1px 4px rgba(0, 0, 0, 0.16);

		background-color: white;
		border: 1px solid lightblue;
		z-index: 1;

		overflow: hidden;
		box-sizing: border-box;
	}

	.sidebar-inner {
		height: 100%;
		width: 100%;
		overflow: scroll;
		position: absolute;
		top: 0;
		left: 0;
	}

	.sidebar-header {
		position: sticky;
		top: 0;
		left: 0;
		right: 0;
		padding: 30px;
		background-color: aliceblue;
		z-index: 100;
		border-bottom: 1px solid aliceblue;
	}

	.sidebar-body {
		display: grid;
		padding: 35px;
	}

	.sidebar-resize-helper {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		width: 10px;
		cursor: col-resize;
		touch-action: none;
		z-index: 3;
	}

	.docx-field-row {
		display: flex;
		flex-direction: row;
		gap: 50px;
		transition: background-color 300ms ease-in;

		margin-left: -35px;
		padding-left: 35px;
		margin-right: -35px;
		padding-right: 35px;
	}

	.docx-field-row:hover {
		background: #e5f4ff;
	}

	.toggle-docx-field-row {
		background: #e5f4ff;
	}

	.related-table-title {
		display: flex;
		flex-direction: column;
		max-width: 700px;
		gap: 30px;
		text-overflow: ellipsis;
	}
</style>
