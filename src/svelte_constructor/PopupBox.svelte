<script>
	let { popupBoxRef = $bindable() } = $props();
</script>

<div
	dropdown="true"
	class="src-components-dropdown-___styles-module__Dropdown___y_t3K for-overflow-dropdown"
	style="min-width: unset !important;
                box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1), 0px 1px 4px rgba(0, 0, 0, 0.16);"
	bind:this={popupBoxRef.elementHook}
	style:display={popupBoxRef.isPopupOpened ? 'initial' : 'none'}
>
	{#each popupBoxRef.dataArrRef as row}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="src-components-customselect-___styles-module__menu___XQSV5 hover-item"
			onclick={() => {
				popupBoxRef.onClickRowFromPopup(row);
				popupBoxRef.isPopupOpened = false;
			}}
		>
			<div class="src-components-customselect-___styles-module__menuItem___UqKfM">
				{row.display_value}
			</div>
		</div>
	{/each}
</div>

<style>
	.for-overflow-dropdown {
		max-height: 500px;
		overflow-y: scroll;
		position: absolute;
	}

	.hover-item {
	}

	.hover-item:hover {
		background-color: #f2f2f2;
	}
</style>
