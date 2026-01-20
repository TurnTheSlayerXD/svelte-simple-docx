<script module>
	import { trackedOpenedInfoPopups } from './referenceField.svelte';

	const trackedPopups = [];
	export function onWindowClick(e) {
		let { target } = e;
		while (target && !target.getAttribute('dropdown')) {
			target = target.parentElement;
		}

		// if it is just other window click, we can close all popups
		if (!target) {
			for (const popup of trackedPopups) {
				popup.isPopupOpened = false;
			}

			for (const infoPopupParams of trackedOpenedInfoPopups) {
				infoPopupParams.isVisible = false;
			}
		}
	}
</script>

<script>
	const { optionField, optionSource, fieldTitle, getFieldTitleCallback, getOptionTitleCallback, onBeforeOptionSelectCallback } = $props();

	const popupState = $state({ isPopupOpened: false });
	trackedPopups.push(popupState);

	let __optionSource = $derived(optionSource);

	const fixOffsetForPopup = (optionField) => {
		const { fieldHook, optionsHook } = optionField;

		const fieldRect = fieldHook.getBoundingClientRect();
		const optionsRect = optionsHook.getBoundingClientRect();

		optionsHook.style.minWidth = fieldHook.offsetWidth + 'px';
		optionsHook.style.left = fieldHook.offsetLeft + 'px';

		if (fieldRect.y + fieldRect.height + optionsRect.height > window.innerHeight) {
			optionsHook.style.bottom = fieldHook.offsetParent.offsetHeight - fieldHook.offsetTop + 'px';
			optionsHook.style.top = 'unset';
		} else {
			optionsHook.style.top = fieldHook.offsetTop + fieldHook.offsetHeight + 'px';
			optionsHook.style.bottom = 'unset';
		}
	};

	function onClickPopupHidingLogic() {
		for (const otherPopupState of trackedPopups) {
			if (otherPopupState !== popupState) {
				otherPopupState.isPopupOpened = false;
			}
		}

		popupState.isPopupOpened = !popupState.isPopupOpened;
	}

	let onChooseColumnClick;
	(() => {
		onChooseColumnClick =
			__optionSource instanceof Function
				? async () => {
						__optionSource = await optionSource();
						onClickPopupHidingLogic();
					}
				: () => {
						onClickPopupHidingLogic();
					};
	})();

	function onSelectNewValue(optionField, column) {
		if (onBeforeOptionSelectCallback) {
			onBeforeOptionSelectCallback(optionField, column);
		}
		optionField.currentOption = column;
		popupState.isPopupOpened = false;
	}
</script>

<div style="display:contents;" dropdown="true">
	<div style="flex: 1 1 auto; max-width: 200px;">
		<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Field___BH07L">
			<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameWrap___STsiA">
				<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Name___fSBsc">
					<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameText___Pc25B">
						<span class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Label___tjzWY"
							><span>{!getFieldTitleCallback ? fieldTitle : getFieldTitleCallback(optionField)}</span></span
						>
					</div>
				</div>
			</div>
			<div class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Input___bLmkj" bind:this={optionField.fieldHook}>
				<div class="src-components-dynamicForms-view-field-select-___styles-module__Input___GDQ_t">
					<div class="src-components-customselect-___styles-module__container___rnMJM">
						<button
							type="button"
							class="src-components-customselect-___styles-module__input___M2cpK"
							tabindex="13"
							onclick={() => {
								onChooseColumnClick(optionField);
							}}
							><span class="src-components-customselect-___styles-module__inputText___J9u6h">
								{!getOptionTitleCallback ? optionField.currentOption?.title : getOptionTitleCallback(optionField.currentOption)}
							</span><span class="src-components-customselect-___styles-module__inputChevron___eSi_J"
								><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path
										fill-rule="evenodd"
										clip-rule="evenodd"
										d="M5.29289 8.29289C5.68342 7.90237 6.31658 7.90237 6.70711 8.29289L12 13.5858L17.2929 8.29289C17.6834 7.90237 18.3166 7.90237 18.7071 8.29289C19.0976 8.68342 19.0976 9.31658 18.7071 9.70711L12.7071 15.7071C12.3166 16.0976 11.6834 16.0976 11.2929 15.7071L5.29289 9.70711C4.90237 9.31658 4.90237 8.68342 5.29289 8.29289Z"
										fill="#2E3238"
									></path>
								</svg>
							</span></button
						>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="src-components-dropdown-___styles-module__Dropdown___y_t3K for-overflow-dropdown"
		style="min-width: unset !important;
                box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1), 0px 1px 4px rgba(0, 0, 0, 0.16);"
		bind:this={optionField.optionsHook}
		style:display={popupState.isPopupOpened ? 'initial' : 'none'}
		{@attach () => {
			if (popupState.isPopupOpened) {
				fixOffsetForPopup(optionField);
			}
		}}
	>
		{#if __optionSource}
			{#each __optionSource as column}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class={'src-components-customselect-___styles-module__menu___XQSV5' +
						(optionField.currentOption?.sys_id === column.sys_id ? ' current-option-background' : '')}
					onclick={() => onSelectNewValue(optionField, column)}
				>
					<div class="src-components-customselect-___styles-module__menuItem___UqKfM">
						{column.title}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.current-option-background {
		background-color: #e7f0fe;
	}

	.for-overflow-dropdown {
		max-height: 500px;
		overflow-y: scroll;
		position: absolute;
	}

	.src-components-customselect-___styles-module__menu___XQSV5:hover {
		background-color: #f2f2f2;
	}

	.popup-overlay {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		top: 0;
		z-index: 10;
	}
</style>
