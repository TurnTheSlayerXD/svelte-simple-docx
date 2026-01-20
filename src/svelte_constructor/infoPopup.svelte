<script module>
	function calcXposition(anchorHook) {
		if (!(anchorHook instanceof HTMLElement)) {
			throw new Error();
		}
		const anchorRect = anchorHook.getBoundingClientRect();
		let leftOffset = anchorRect.right;
		let rightOffset = window.innerWidth - anchorRect.left;
		return leftOffset > rightOffset ? { left: 'unset', right: rightOffset + 'px' } : { left: leftOffset + 'px', right: 'unset' };
	}

	function calcYPosition(anchorHook) {
		if (!(anchorHook instanceof HTMLElement)) {
			throw new Error();
		}
		const anchorRect = anchorHook.getBoundingClientRect();
		let topOffset = anchorRect.top + anchorRect.height;
		let bottomOffset = window.innerHeight - anchorRect.top;
		return topOffset > bottomOffset
			? {
					top: 'unset',
					bottom: bottomOffset + 'px',
					maxHeight: anchorRect.top - 100 + 'px'
				}
			: {
					top: topOffset + 'px',
					bottom: 'unset',
					maxHeight: bottomOffset - 100 + 'px'
				};
	}
</script>

<script>
	let { recordFields, tableName, recordDisplayValue, sys_id, anchorHook } = $props();

	// anchorHook.offsetParent.style.overflow = 'hidden';
	let selfHook = $state();
	let xPosition = $state(calcXposition(anchorHook));
	let yPosition = $state(calcYPosition(anchorHook));
</script>

<div
	style:left={xPosition.left}
	style:right={xPosition.right}
	style:top={yPosition.top}
	style:bottom={yPosition.bottom}
	bind:this={selfHook}
	dropdown="true"
	class="src-components-popup-___styles-module__Popup___jRzAx src-components-popup-___styles-module__animated___KMzA8"
	style:position="fixed"
	style:z-index="200"
>
	<div class="src-components-popup-___styles-module__PopupHeader___weJVI">
		<span title="" class="src-components-popup-___styles-module__PopupHeaderText___Fzcxx" data-test="popup-text">{recordDisplayValue}</span>
		<!-- svelte-ignore a11y_consider_explicit_label -->
		<div class="src-components-popup-___styles-module__PopupButtons___n91Ql">
			<!-- svelte-ignore a11y_consider_explicit_label -->
			<a class="src-components-popup-___styles-module__PopupLink___MpzF4" href={`/record/${tableName}/${sys_id}`}
				><button
					class="src-components-button-___styles-module__IconMicro___mXubg src-components-popup-___styles-module__OpenIcon___LdMqT"
					type="button"
					><span class=""
						><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path
								d="M15 2C14.4477 2 14 2.44772 14 3C14 3.55228 14.4477 4 15 4H18.5859L13.2929 9.29297C12.9024 9.68349 12.9024 10.3167 13.2929 10.7072C13.6834 11.0977 14.3166 11.0977 14.7071 10.7072L20 5.41429V9C20 9.55228 20.4477 10 21 10C21.5523 10 22 9.55228 22 9V3C22 2.44772 21.5523 2 21 2H15Z"
								fill="#2E3238"
							></path>
							<path
								d="M4 15C4 14.4477 3.55228 14 3 14C2.44772 14 2 14.4477 2 15V21C2 21.5523 2.44772 22 3 22H9C9.55228 22 10 21.5523 10 21C10 20.4477 9.55228 20 9 20H5.41423L10.7071 14.7071C11.0976 14.3166 11.0976 13.6834 10.7071 13.2929C10.3166 12.9024 9.68343 12.9024 9.29291 13.2929L4 18.5858V15Z"
								fill="#2E3238"
							></path>
						</svg>
					</span></button
				></a
			>
			<a class="src-components-popup-___styles-module__PopupLink___MpzF4" target="_blank" href={`/record/${tableName}/${sys_id}`}
				><button
					class="src-components-button-___styles-module__IconMicro___mXubg src-components-popup-___styles-module__OpenIcon___LdMqT"
					type="button"
					><span class=""
						><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path
								fill-rule="evenodd"
								clip-rule="evenodd"
								d="M5 7C4.73478 7 4.48043 7.10536 4.29289 7.29289C4.10536 7.48043 4 7.73478 4 8V19C4 19.2652 4.10536 19.5196 4.29289 19.7071C4.48043 19.8946 4.73478 20 5 20H16C16.2652 20 16.5196 19.8946 16.7071 19.7071C16.8946 19.5196 17 19.2652 17 19V13C17 12.4477 17.4477 12 18 12C18.5523 12 19 12.4477 19 13V19C19 19.7957 18.6839 20.5587 18.1213 21.1213C17.5587 21.6839 16.7957 22 16 22H5C4.20435 22 3.44129 21.6839 2.87868 21.1213C2.31607 20.5587 2 19.7957 2 19V8C2 7.20435 2.31607 6.44129 2.87868 5.87868C3.44129 5.31607 4.20435 5 5 5H11C11.5523 5 12 5.44772 12 6C12 6.55228 11.5523 7 11 7H5Z"
								fill="#2E3238"
							></path>
							<path
								fill-rule="evenodd"
								clip-rule="evenodd"
								d="M14 3C14 2.44772 14.4477 2 15 2H21C21.5523 2 22 2.44772 22 3V9C22 9.55228 21.5523 10 21 10C20.4477 10 20 9.55228 20 9V4H15C14.4477 4 14 3.55228 14 3Z"
								fill="#2E3238"
							></path>
							<path
								fill-rule="evenodd"
								clip-rule="evenodd"
								d="M21.7071 2.29289C22.0976 2.68342 22.0976 3.31658 21.7071 3.70711L10.7071 14.7071C10.3166 15.0976 9.68342 15.0976 9.29289 14.7071C8.90237 14.3166 8.90237 13.6834 9.29289 13.2929L20.2929 2.29289C20.6834 1.90237 21.3166 1.90237 21.7071 2.29289Z"
								fill="#2E3238"
							></path>
						</svg>
					</span></button
				></a
			>
		</div>
	</div>

	<div style:max-height={yPosition.maxHeight} class="src-components-popup-___styles-module__PopupContent___kLtsE">
		<div class="src-components-recordPopup-previewForm-___styles-module__Preview___qHIEo">
			{#each recordFields as field}
				<div class="src-components-recordPopup-previewForm-___styles-module__Field___kPMN5">
					<div class="src-components-recordPopup-previewForm-___styles-module__FieldName___w8Gvt">{field.title}</div>
					<div class="src-components-recordPopup-previewForm-___styles-module__FieldContent___eTd0z">
						<div title="" class="src-components-recordPopup-previewForm-___styles-module__Text___Qxqoy">{field.display_value}</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
