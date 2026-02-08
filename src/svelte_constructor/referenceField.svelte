<script module>
	const REQUEST_SLEEP_TIME = 1000;

	let lastRequstTime = performance.now();

	async function sleepBeforeApiRequest() {
		let now = performance.now();
		while (now - lastRequstTime < REQUEST_SLEEP_TIME) {
			await sleepAsync(REQUEST_SLEEP_TIME - (now - lastRequstTime));
			now = performance.now();
		}
		lastRequstTime = now;
	}

	export async function fetchDataFromApi(table, condition, displayByRefColumnName, otherColumnsToFetch = []) {
		await sleepBeforeApiRequest();

		const columnsToFetch = [displayByRefColumnName, 'sys_id', ...otherColumnsToFetch].join(',');
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
		}
		return data;
	}

	export async function fetchDisplayValue(table, sys_id) {
		await sleepBeforeApiRequest();
		const resp = await fetch(`/v1/field/display-name?table_name=${table}&sys_id=${sys_id}`);
		const { data } = await resp.json();
		return data.display_name;
	}

	async function fetchDisplayByRefColumnName(table) {
		let now = performance.now();
		while (now - lastRequstTime < REQUEST_SLEEP_TIME) {
			await sleepAsync(REQUEST_SLEEP_TIME - (now - lastRequstTime));
			now = performance.now();
		}
		lastRequstTime = now;

		const condition = `(display_by_ref=1^table_id.name=${table})`;
		const columnsToFetch = `column_name,title,sys_id`;
		const data = (
			await fetch(
				'/rest/v1/table/sys_db_column?sysparm_exclude_reference_link=1' + `&sysparm_query=${condition}` + `&sysparm_fields=${columnsToFetch}`
			).then((t) => t.json())
		).data;
		return data[0].column_name;
	}

	const displayColumnNameCache = new Map();

	async function getDisplayByRefColumnName() {
		if (!displayColumnNameCache.has(table)) {
			displayColumnNameCache.set(table, await fetchDisplayByRefColumnName(table));
		}
		return displayColumnNameCache.get(table);
	}

	async function getRecordsLikeDisplayValue(table, likeDisplayValue, staticCondition = '', displayByRefColumnName, otherColumnsToFetch) {
		if (!displayColumnNameCache.has(table)) {
			if (!!displayByRefColumnName) {
				displayColumnNameCache.set(table, displayByRefColumnName);
			} else {
				displayColumnNameCache.set(table, await fetchDisplayByRefColumnName(table));
			}
		}

		const displayColumnName = displayColumnNameCache.get(table);
		const condition = concatConditions(staticCondition, `${displayColumnName}LIKE${likeDisplayValue}`);
		return await fetchDataFromApi(table, condition, displayColumnName, otherColumnsToFetch);
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
		// console.log('baseElement', baseElement);
		// console.log('popupElement', popupElement);
	}

	function sleepAsync(ms) {
		return new Promise((resolve) => setTimeout(() => resolve(true), ms));
	}
	async function fetchRecordFields(table, sys_id) {
		const response = await fetch(`/v1/preview/${table}/${sys_id}?form_view=Preview`, {
			headers: {
				Authorization: `Bearer ${s_user.accessToken}`
			}
		});
		const { data } = await response.json();
		const returnData = data.sections.flatMap((d) =>
			d.elements
				.filter((e) => !!e.column_id)
				.map((e) => ({
					title: e.name,
					display_value: typeof e.value === 'object' && !!e.value ? e.value.display_value : e.value
				}))
		);
		return returnData;
	}

	export const trackedOpenedInfoPopups = [];
	function addInfoPopupToTrack(infoPopupRef) {
		trackedOpenedInfoPopups.push(infoPopupRef);
	}

	function hideAllInfoPopups() {
		for (const infoPopup of trackedOpenedInfoPopups) {
			infoPopup.isVisible = false;
		}
	}

	// left: 37, up: 38, right: 39, down: 40,
	// spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
	let keys = { 37: 1, 38: 1, 39: 1, 40: 1 };
	function preventDefault(e) {
		e.preventDefault();
	}
	function preventDefaultForScrollKeys(e) {
		if (keys[e.keyCode]) {
			preventDefault(e);
			return false;
		}
	}
	// modern Chrome requires { passive: false } when adding event
	let supportsPassive = false;
	try {
		window.addEventListener(
			'test',
			null,
			Object.defineProperty({}, 'passive', {
				get: function () {
					supportsPassive = true;
				}
			})
		);
	} catch (e) {}
	let wheelOpt = supportsPassive ? { passive: false } : false;
	let wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';
	// call this to Disable
	export function disableScroll() {
		window.addEventListener('DOMMouseScroll', preventDefault, false); // older FF
		window.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
		window.addEventListener('touchmove', preventDefault, wheelOpt); // mobile
		window.addEventListener('keydown', preventDefaultForScrollKeys, false);
	}

	// call this to Enable
	export function enableScroll() {
		window.removeEventListener('DOMMouseScroll', preventDefault, false);
		window.removeEventListener(wheelEvent, preventDefault, wheelOpt);
		window.removeEventListener('touchmove', preventDefault, wheelOpt);
		window.removeEventListener('keydown', preventDefaultForScrollKeys, false);
	}
</script>

<script>
	import InfoPopup from './infoPopup.svelte';

	import { disableScrollBar } from './scrollableHandling.svelte';
	let {
		table,
		condition: staticCondition,
		currentValue = $bindable({ display_value: null, sys_id: null }),
		fieldTitle,
		popupBoxRef = $bindable(),
		actionWhenValueSelected = () => console.log('not selected actionWhenValueSelected'),
		actionWhenValueCleared = () => console.log('not selected actionWhenValueCleared'),
		otherColumnsToFetch = [],
		displayByRefColumnName = ''
	} = $props();

	let searchValue = $state('');

	let referenceFieldHook = $state();

	let isFieldFocused = $state(false);

	let inputTagHook = $state();

	let isRefButtonVisible = $derived(!isFieldFocused && !!currentValue.sys_id);

	let forInfoPopupHook = $state();

	let dictionaryWindow = {
		instance: null,
		isFindDictionary: false
	};

	const infoPopupParams = $state({ isVisible: false, recordFields: null, tableName: null, recordDisplayValue: null, sys_id: null, anchorHook: null });
	addInfoPopupToTrack(infoPopupParams);

	(() => {
		if (currentValue.sys_id) {
			fetchDisplayValue(table, currentValue.sys_id).then((display_value) => (currentValue.display_value = display_value));
		}
	})();

	function onClickRowFromPopup(newValue) {
		currentValue.sys_id = newValue.sys_id;
		currentValue.display_value = newValue.display_value;
		actionWhenValueSelected(newValue);
	}

	let lastSearch = { time: performance.now(), value: '' };

	const TIME_DIF = 400;
	async function onSearchValueChange() {
		const savedSearchValue = String(searchValue);

		lastSearch.value = searchValue;
		lastSearch.time = performance.now();
		const sinceLastInput = performance.now() - lastSearch.time;

		await sleepAsync(TIME_DIF - sinceLastInput);

		if (savedSearchValue === lastSearch.value) {
			const data = await getRecordsLikeDisplayValue(table, savedSearchValue, staticCondition, displayByRefColumnName, otherColumnsToFetch);
			popupBoxRef.dataArrRef = data;
			if (!popupBoxRef.isPopupOpened) {
				popupBoxRef.onClickRowFromPopup = onClickRowFromPopup;
				setOffsetForPopup(referenceFieldHook, popupBoxRef.elementHook);
				popupBoxRef.isPopupOpened = true;
			}
		}
	}

	function onClearCurrentValue() {
		currentValue.sys_id = null;
		currentValue.display_value = null;
		searchValue = '';
		actionWhenValueSelected(currentValue);
	}

	function onInputFieldFocus() {
		isFieldFocused = true;
	}

	function onInputFieldBlur() {
		isFieldFocused = false;
	}

	async function onClickRefButton(event) {
		event.preventDefault();
		event.stopPropagation();

		let wasVisible = infoPopupParams.isVisible;
		hideAllInfoPopups();

		infoPopupParams.recordFields = await fetchRecordFields(table, currentValue.sys_id);
		infoPopupParams.tableName = table;
		infoPopupParams.recordDisplayValue = currentValue.display_value;
		infoPopupParams.sys_id = currentValue.sys_id;
		infoPopupParams.anchorHook = forInfoPopupHook;
		infoPopupParams.isVisible = !wasVisible;

		if (infoPopupParams.isVisible) {
			// disableScroll();
			disableScrollBar();
		}
	}

	function onMiddleClickRefButton(event) {
		if (event.button !== 1) {
			return;
		}
		const aHook = document.createElement('a');
		aHook.href = `/record/${table}/${currentValue.sys_id}`;
		aHook.target = '_blank';
		aHook.click();
	}

	async function onDictionaryWindowMessage(e) {
		const data = await fetchDataFromApi(table, `sys_id=${e.data.database_value}`, displayByRefColumnName, otherColumnsToFetch);
		onClickRowFromPopup(data[0]);
		if (dictionaryWindow.instance) {
			dictionaryWindow.instance.close();
		}
	}

	function onKeydownDictionary(e) {
		dictionaryWindow.isFindDictionary = true;
	}

	async function openDictionary() {
		const width = window.screen.width * 0.7;
		const height = window.screen.height * 0.7;
		const top = 0;
		const left = 0;

		window.addEventListener('message', onDictionaryWindowMessage);

		const url = new URL(`/dictionary/${table}`, window.location.origin);
		url.searchParams.set('condition', staticCondition);
		url.searchParams.set('is_fixed', true);
		url.searchParams.set('type', 'dictionary');

		dictionaryWindow.instance = window.open(url.pathname + url.search, 'Dictionary', `width=${width},height=${height},top=${top},left=${left}`);
		dictionaryWindow.instance.addEventListener('keydown', onKeydownDictionary);

		if (dictionaryWindow.instance) {
			const windowOpener = dictionaryWindow.instance.opener;
			windowOpener.onblur = () => {};
			dictionaryWindow.instance.onblur = (e) => {
				if (dictionaryWindow.isFindDictionary) {
					dictionaryWindow.isFindDictionary = false;
				} else {
					dictionaryWindow.instance.close();
				}
			};
			setTimeout(
				() =>
					(dictionaryWindow.instance.onbeforeunload = () => {
						window.removeEventListener('message', onDictionaryWindowMessage);
					}),
				300
			);
		}
	}
</script>

<div style="max-width: 400px;" class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Field___BH07L">
	<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameWrap___STsiA">
		<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Name___fSBsc">
			<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameText___Pc25B">
				<span class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Label___tjzWY">
					<span>{fieldTitle}</span>
				</span>
			</div>
		</div>
	</div>
	<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Input___bLmkj" bind:this={referenceFieldHook}>
		<div class="src-components-dynamicForms-view-field-reference-___styles-module__ReferenceWrap___eRJAI">
			<!-- svelte-ignore a11y_consider_explicit_label -->
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
								<!-- svelte-ignore a11y_consider_explicit_label -->
								<!-- svelte-ignore a11y_positive_tabindex -->
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
								>
								</button>
								<div class="src-components-dynamicForms-view-field-reference-___styles-module__BadgeWrap___HT7O6">
									<button
										class="src-components-button-___styles-module__Icon___gxSRu src-components-dynamicForms-view-field-reference-___styles-module__Badge___In6nV"
										type="button"
										onclick={onClickRefButton}
										onmousedown={onMiddleClickRefButton}
										bind:this={forInfoPopupHook}
										>{currentValue.display_value}
									</button>
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
				<!-- svelte-ignore a11y_consider_explicit_label -->
				<button
					class="src-components-button-___styles-module__IconBorder___GkTQy src-components-dynamicForms-view-field-reference-___styles-module__button___LsGpV"
					type="button"
					><span class=""
						><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path
								d="M13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5V11H5C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13H11V19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19V13H19C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11H13V5Z"
								fill="#2E3238"
							></path>
						</svg>
					</span></button
				>

				<!-- svelte-ignore a11y_consider_explicit_label -->
				<button
					class="src-components-button-___styles-module__IconBorder___GkTQy src-components-dynamicForms-view-field-reference-___styles-module__button___LsGpV"
					type="button"
					onclick={openDictionary}
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

{#if infoPopupParams.isVisible}
	<InfoPopup
		sys_id={infoPopupParams.sys_id}
		anchorHook={infoPopupParams.anchorHook}
		recordDisplayValue={infoPopupParams.recordDisplayValue}
		tableName={infoPopupParams.tableName}
		recordFields={infoPopupParams.recordFields}
	></InfoPopup>
{/if}
