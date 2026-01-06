<script module>
	async function fetchDataFromApi(table, condition, displayByRefColumnName) {
		const columnsToFetch = `${displayByRefColumnName},sys_id`;
		const response = await fetch(
			`/rest/v1/table/${table}?sysparm_exclude_reference_link=1&sysparm_query=(${condition})` + `&sysparm_fields=${columnsToFetch}`,
			{
				headers: {
					Authorization: `Bearer ${s_user.accessToken}`
				}
			}
		);
		const { data } = await response.json();
		for (const d of data) {
			d.display_value = d[displayByRefColumnName];
			d[displayByRefColumnName] = null;
		}
		return data;
	}

	async function fetchDisplayByRefColumnName(table) {
		let condition = `(display_by_ref=1^table_id.name=${table})`;
		let columnsToFetch = `column_name,title,sys_id`;
		const data = (
			await fetch(
				'/rest/v1/table/sys_db_column?sysparm_exclude_reference_link=1' + `&sysparm_query=${condition}` + `&sysparm_fields=${columnsToFetch}`
			).then((t) => t.json())
		).data;
		return data[0].column_name;
	}

	function concatConditions(dst, newValue) {
		if (dst.length > 0) {
			return `${dst}^${newValue}`;
		}
		return newValue;
	}

	function setOffsetForPopup(baseElement, popupElement) {
		popupElement.style.minWidth = baseElement.offsetWidth + 'px';
		popupElement.style.left = baseElement.offsetLeft + 'px';
		const baseRect = baseElement.getBoundingClientRect();
		const popupRect = popupElement.getBoundingClientRect();
		if (baseRect.y + baseRect.height + popupRect.height > window.innerHeight) {
			popupElement.style.bottom = baseElement.offsetParent.offsetHeight - baseElement.offsetTop + 'px';
			popupElement.style.top = 'unset';
		} else {
			popupElement.style.top = baseElement.offsetTop + baseElement.offsetHeight + 'px';
			popupElement.style.bottom = 'unset';
		}
	}

	function sleepAsync(ms = 300) {
		return new Promise((resolve, reject) => setTimeout(() => resolve(true), ms));
	}
</script>

<script>
	let { table, condition, nameOfDisplayByRefColumn, popupBoxRef = $bindable() } = $props();

	let searchValue = $state('');
	let referenceFieldHook = $state();

	let currentValue = $state({ display_value: null, sys_id: null });
	let isFieldFocused = $state(false);

	let isRefButtonVisible = $derived(!isFieldFocused && !!currentValue.sys_id);

	let inputTagHook = $state();

	let isSearchActive = false;

	let displayByRefColumnName = '';

	function onClickRowFromPopup(newValue) {
		currentValue = newValue;
	}

	let lastRequstTime = performance.now();
	const REQUEST_SLEEP_TIME = 1000;
	async function onSearchValueChange() {
		console.log('searchValue', searchValue);
		if (!searchValue || isSearchActive) {
			return;
		}
		if (!displayByRefColumnName) {
			displayByRefColumnName = await fetchDisplayByRefColumnName(table);
		}

		let now = performance.now();
		while (now - lastRequstTime < REQUEST_SLEEP_TIME) {
			await sleepAsync(REQUEST_SLEEP_TIME - (now - lastRequstTime));
			now = performance.now();
		}
		lastRequstTime = performance.now();

		console.log('REQUEST AT', lastRequstTime);
		const data = await fetchDataFromApi(table, concatConditions(condition, `${displayByRefColumnName}LIKE${searchValue}`), displayByRefColumnName);
		popupBoxRef.dataArrRef = data;
		// console.log('response data', data);
		if (!popupBoxRef.isPopupOpened) {
			setOffsetForPopup(referenceFieldHook, popupBoxRef.elementHook);
			popupBoxRef.isPopupOpened = true;
			popupBoxRef.onClickRowFromPopup = onClickRowFromPopup;
		}
	}

	function onClearCurrentValue() {
		currentValue.sys_id = null;
		currentValue.display_value = null;
	}

	function onInputFieldFocus() {
		isFieldFocused = true;
		onClearCurrentValue();
		// setTimeout(() => {
		// 	console.log('isRefButtonVisible', !!isRefButtonVisible);
		// 	console.log('!!currentValue.sys_id && !isFieldFocused', !!currentValue.sys_id && !isFieldFocused);
		// }, 100);
	}
	function onInputFieldBlur() {
		isFieldFocused = false;
	}
</script>

<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Field___BH07L">
	<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameWrap___STsiA">
		<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Name___fSBsc">
			<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameText___Pc25B">
				<span class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Label___tjzWY">
					<span>{nameOfDisplayByRefColumn}</span>
				</span>
			</div>
		</div>
	</div>
	<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Input___bLmkj" bind:this={referenceFieldHook}>
		<div class="src-components-dynamicForms-view-field-reference-___styles-module__ReferenceWrap___eRJAI">
			<div class="  src-components-dynamicForms-view-field-reference-___styles-module__Reference____LE_r">
				<div class="src-components-dynamicForms-view-field-reference-___styles-module__input___ugSOq">
					<div class="src-components-dynamicForms-view-field-reference-___styles-module__FieldWrap___vC5cf">
						{#if !isRefButtonVisible}
							<div style="flex: 1 1 auto;">
								<div class="src-components-dynamicForms-view-field-stringInput-___styles-module__Input___SngSj">
									<input
										{@attach () => {
											if (isFieldFocused) {
												inputTagHook?.focus();
											}
										}}
										tabindex="4"
										type="text"
										bind:value={searchValue}
										bind:this={inputTagHook}
										oninput={onSearchValueChange}
										onfocus={onInputFieldFocus}
										onblur={onInputFieldBlur}
									/>
								</div>
							</div>
							<div
								class="src-components-dynamicForms-view-field-reference-___styles-module__Field___usWmV src-components-dynamicForms-view-field-reference-___styles-module__Hidden___ngVHd"
							>
								<button type="button" class="src-components-dynamicForms-view-field-reference-___styles-module__FieldOverlay___flsnR" tabindex="4">
								</button>
							</div>
						{:else}
							<div class="src-components-dynamicForms-view-field-reference-___styles-module__Field___usWmV">
								<button
									onclick={onInputFieldFocus}
									title=""
									type="button"
									class="src-components-dynamicForms-view-field-reference-___styles-module__FieldOverlay___flsnR"
									tabindex="3"
								>
								</button>
								<div class="src-components-dynamicForms-view-field-reference-___styles-module__BadgeWrap___HT7O6">
									<button
										class="src-components-button-___styles-module__Icon___gxSRu src-components-dynamicForms-view-field-reference-___styles-module__Badge___In6nV"
										type="button"
										tabindex="3"
										data-disabled="false"
										data-test="icon-test-button">{currentValue.display_value}</button
									>
								</div>
								<button
									title=""
									class="src-components-button-___styles-module__IconMicro___mXubg src-components-dynamicForms-view-field-reference-___styles-module__FieldClear___XOD0X"
									type="button"
									onclick={onClearCurrentValue}
									><span class=""
										><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path
												fill-rule="evenodd"
												clip-rule="evenodd"
												d="M12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3ZM1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 18.0751 18.0751 23 12 23C5.92487 23 1 18.0751 1 12Z"
												fill="#2E3238"
											></path>
											<path
												fill-rule="evenodd"
												clip-rule="evenodd"
												d="M15.7071 8.29289C16.0976 8.68342 16.0976 9.31658 15.7071 9.70711L9.70711 15.7071C9.31658 16.0976 8.68342 16.0976 8.29289 15.7071C7.90237 15.3166 7.90237 14.6834 8.29289 14.2929L14.2929 8.29289C14.6834 7.90237 15.3166 7.90237 15.7071 8.29289Z"
												fill="#2E3238"
											></path>
											<path
												fill-rule="evenodd"
												clip-rule="evenodd"
												d="M8.29289 8.29289C8.68342 7.90237 9.31658 7.90237 9.70711 8.29289L15.7071 14.2929C16.0976 14.6834 16.0976 15.3166 15.7071 15.7071C15.3166 16.0976 14.6834 16.0976 14.2929 15.7071L8.29289 9.70711C7.90237 9.31658 7.90237 8.68342 8.29289 8.29289Z"
												fill="#2E3238"
											></path>
										</svg>
									</span></button
								>
							</div>
						{/if}
					</div>
				</div>
				<button
					class="src-components-button-___styles-module__IconBorder___GkTQy src-components-dynamicForms-view-field-reference-___styles-module__button___LsGpV"
					type="button"
					tabindex="4"
					><span class=""
						><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path
								d="M13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5V11H5C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13H11V19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V13H19C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11H13V5Z"
								fill="#2E3238"
							></path>
						</svg>
					</span></button
				><button
					class="src-components-button-___styles-module__IconBorder___GkTQy src-components-dynamicForms-view-field-reference-___styles-module__button___LsGpV"
					type="button"
					tabindex="4"
					><span class=""
						><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path
								fill-rule="evenodd"
								clip-rule="evenodd"
								d="M9.5 2C13.6421 2 17 5.35786 17 9.5C17 11.2105 16.4259 12.7861 15.4619 14.0479L21.7109 20.2969C22.1014 20.6874 22.1014 21.3204 21.7109 21.7109C21.3204 22.1014 20.6874 22.1014 20.2969 21.7109L14.0479 15.4619C12.7861 16.4259 11.2105 17 9.5 17C5.35786 17 2 13.6421 2 9.5C2 5.35786 5.35786 2 9.5 2ZM9.5 4C6.46243 4 4 6.46243 4 9.5C4 12.5376 6.46243 15 9.5 15C12.5376 15 15 12.5376 15 9.5C15 6.46243 12.5376 4 9.5 4Z"
								fill="#2E3238"
							></path>
						</svg>
					</span></button
				>
			</div>
		</div>
	</div>
</div>
