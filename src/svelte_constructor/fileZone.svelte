<script>
	import { processFile, templateRecordState, generateTemplate } from './script.svelte.js';

	function removeFile(file) {
		if (file) {
			buttonsState.isUploadPreproccessedDisabled = true;
			return uploadedFiles.splice(uploadedFiles.indexOf(file));
		}
		buttonsState.isUploadPreproccessedDisabled = true;
		return uploadedFiles.shift();
	}

	function downloadPreprocessedFile() {
		const link = document.createElement('a');
		link.download = 'file.docx';
		link.href = docxUrl;
		link.click();
		// URL.revokeObjectURL(docxUrl);
	}

	function uploadContainerDragOver(ev) {
		ev.preventDefault();
		ev.stopImmediatePropagation();
		containerState.isDragging = true;
	}

	function uploadContainerDragLeave(ev) {
		console.log('uploadContainerDragLeave');
		ev.preventDefault();
		ev.stopImmediatePropagation();
		containerState.isDragging = false;
	}

	function filezoneDrop(ev) {
		console.log('filezoneDrop');
		ev.preventDefault();
		ev.stopImmediatePropagation();
		console.log(ev);
		containerState.isDragging = false;
	}

	function uploadFromDevice() {
		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.multiple = true;
		fileInput.accept = '.docx';

		const handleChange = async (target) => {
			const { files } = target.currentTarget;
			if (!files) {
				return;
			}
			removeFile(uploadedFiles);
			const file = files[0];
			const arrayBuffer = await file.arrayBuffer();
			currentDocxArrayBuffer = arrayBuffer;
			docxUrl = await processFile({ buttonsState, fileBlob: arrayBuffer, fileName: file.name, docxFiles });
			uploadedFiles.push({ fileName: file.name });
		};

		fileInput.addEventListener('change', handleChange);
		fileInput.click();
	}

	const uploadedFiles = $state([]);
	let currentDocxArrayBuffer;
	let docxUrl = '';
	let files;
	const containerState = $state({ isDragging: false });
	const docxFiles = {
		sourceDocx: null,
		templateDocx: null
	};

	const buttonsState = $state({
		isUploadPreproccessedDisabled: true
	});
</script>

<div class="upload-specification" style="margin-left: 0;">
	<div class="upload-specification__title">
		<div class="upload-specification__title-text">Upload the .docx template document</div>
	</div>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		id="fileZone"
		class="upload-specification__fileZone"
		ondrop={(ev) => filezoneDrop(ev)}
		ondragover={(ev) => uploadContainerDragOver(ev)}
		ondragleave={(ev) => uploadContainerDragLeave(ev)}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			id="upload-container"
			class={containerState.isDragging ? 'dragover' : ''}
			ondragover={(ev) => uploadContainerDragOver(ev)}
			ondragleave={(ev) => uploadContainerDragLeave(ev)}
		>
			<div class="dragoverState">
				<div class="dragoverState__dragBoxIcon">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M3 14C3.55228 14 4 14.4477 4 15V19C4 19.2652 4.10536 19.5196 4.29289 19.7071C4.48043 19.8946 4.73478 20 5 20H19C19.2652 20 19.5196 19.8946 19.7071 19.7071C19.8946 19.5196 20 19.2652 20 19V15C20 14.4477 20.4477 14 21 14C21.5523 14 22 14.4477 22 15V19C22 19.7957 21.6839 20.5587 21.1213 21.1213C20.5587 21.6839 19.7957 22 19 22H5C4.20435 22 3.44129 21.6839 2.87868 21.1213C2.31607 20.5587 2 19.7957 2 19V15C2 14.4477 2.44772 14 3 14Z"
							fill="#0068B2"
						></path>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M11.2929 2.29289C11.6834 1.90237 12.3166 1.90237 12.7071 2.29289L17.7071 7.29289C18.0976 7.68342 18.0976 8.31658 17.7071 8.70711C17.3166 9.09763 16.6834 9.09763 16.2929 8.70711L12 4.41421L7.70711 8.70711C7.31658 9.09763 6.68342 9.09763 6.29289 8.70711C5.90237 8.31658 5.90237 7.68342 6.29289 7.29289L11.2929 2.29289Z"
							fill="#0068B2"
						></path>
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M12 2C12.5523 2 13 2.44772 13 3V15C13 15.5523 12.5523 16 12 16C11.4477 16 11 15.5523 11 15V3C11 2.44772 11.4477 2 12 2Z"
							fill="#0068B2"
						></path>
					</svg>
				</div>
				<div class="dragoverState__dragBoxText">Drag files</div>
			</div>
			<div class="defaultState">
				<svg width="17" height="18" viewBox="0 0 17 18" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M7.66674 3.51207L4.92509 6.26028C4.60008 6.5854 4.06671 6.5854 3.74172 6.26028C3.41671 5.93537 3.41671 5.40213 3.74172 5.07702L7.90839 0.910349C8.23338 0.585439 8.76675 0.585439 9.09176 0.910349L13.2584 5.07702C13.5834 5.40213 13.5834 5.93537 13.2584 6.26028C12.9334 6.5854 12.4 6.5854 12.0751 6.26028L9.33341 3.51207V11.502C9.33341 11.9604 8.9584 12.3353 8.50008 12.3353C8.04173 12.3353 7.66674 11.9604 7.66674 11.502V3.51207Z"
						fill="#2E3238"
					></path>
					<path
						d="M14.3333 17.3353H2.66667C2.00001 17.3353 1.36667 17.0688 0.900004 16.6021C0.433339 16.1354 0.166667 15.502 0.166667 14.8353V11.502C0.166667 11.0436 0.541677 10.6687 1 10.6687C1.45832 10.6687 1.83333 11.0436 1.83333 11.502V14.8353C1.83333 15.0603 1.92499 15.2687 2.07498 15.427C2.23332 15.5769 2.44168 15.6686 2.66667 15.6686H14.3333C14.5583 15.6686 14.7667 15.5769 14.925 15.427C15.075 15.2687 15.1667 15.0603 15.1667 14.8353V11.502C15.1667 11.0436 15.5417 10.6687 16 10.6687C16.4583 10.6687 16.8333 11.0436 16.8333 11.502V14.8353C16.8333 15.502 16.5667 16.1354 16.1 16.6021C15.6333 17.0688 15 17.3353 14.3333 17.3353Z"
						fill="#2E3238"
					></path>
				</svg>
				<div>
					<!-- <input
                        bind:files
                        class="display-none"
                        id="file-input"
                        type="file"
                        accept=".docx"
                        onchange={() => handleFileAsync()}
                    /> -->
					<label>Drag an .xlsx file or</label>
				</div>
				<button class="src-components-button-___styles-module__Default___Lp0Il" onclick={() => uploadFromDevice()}> Upload from device </button>
			</div>
		</div>

		{#each uploadedFiles as file}
			<div id="uploadedFileContainer" class="uploadedFileContainer">
				<div class="uploadedFileContainer__fileContent">
					<div class="uploadedFileContainer__fileConten__fileContentIcon green">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
							<path
								d="M6 23H18C18.796 23 19.559 22.68 20.121 22.12C20.684 21.56 21 20.8 21 20V9C21 8.73 20.895 8.48004 20.707 8.29004L13.707 1.29004C13.655 1.24004 13.588 1.21 13.527 1.172C13.478 1.141 13.437 1.1 13.384 1.078C13.264 1.028 13.134 1 13.001 1H6C5.204 1 4.441 1.32 3.879 1.88C3.316 2.44 3 3.2 3 4V20C3 20.8 3.316 21.56 3.879 22.12C4.441 22.68 5.204 23 6 23ZM14 4.41296L17.589 8H14V4.41296ZM5 4C5 3.73 5.105 3.48004 5.293 3.29004C5.48 3.11004 5.735 3 6 3H12V9C12 9.55 12.448 10 13 10H19V20C19 20.27 18.895 20.52 18.707 20.71C18.52 20.89 18.265 21 18 21H6C5.735 21 5.48 20.89 5.293 20.71C5.105 20.52 5 20.27 5 20V4Z"
								fill="#00662B"
							/>
						</svg>
					</div>
					<div class="uploadedFileContainer__fileParams">
						<div class="uploadedFileContainer__fileParams__fileName">
							{file.fileName}
						</div>
						<div class="uploadedFileContainer__fileParams__fileIcons">
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<svg
								class="removeFile"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								onclick={() => removeFile(file)}
							>
								<path
									fill-rule="evenodd"
									clip-rule="evenodd"
									d="M2 6C2 5.44772 2.44772 5 3 5H21C21.5523 5 22 5.44772 22 6C22 6.55228 21.5523 7 21 7H3C2.44772 7 2 6.55228 2 6Z"
									fill="#2E3238"
								></path>
								<path
									fill-rule="evenodd"
									clip-rule="evenodd"
									d="M10 3C9.73478 3 9.48043 3.10536 9.29289 3.29289C9.10536 3.48043 9 3.73478 9 4V5H15V4C15 3.73478 14.8946 3.48043 14.7071 3.29289C14.5196 3.10536 14.2652 3 14 3H10ZM17 5V4C17 3.20435 16.6839 2.44129 16.1213 1.87868C15.5587 1.31607 14.7956 1 14 1H10C9.20435 1 8.44129 1.31607 7.87868 1.87868C7.31607 2.44129 7 3.20435 7 4V5H5C4.44772 5 4 5.44772 4 6V20C4 20.7957 4.31607 21.5587 4.87868 22.1213C5.44129 22.6839 6.20435 23 7 23H17C17.7957 23 18.5587 22.6839 19.1213 22.1213C19.6839 21.5587 20 20.7957 20 20V6C20 5.44772 19.5523 5 19 5H17ZM6 7V20C6 20.2652 6.10536 20.5196 6.29289 20.7071C6.48043 20.8946 6.73478 21 7 21H17C17.2652 21 17.5196 20.8946 17.7071 20.7071C17.8946 20.5196 18 20.2652 18 20V7H6Z"
									fill="#2E3238"
								></path>
								<path
									fill-rule="evenodd"
									clip-rule="evenodd"
									d="M10 10C10.5523 10 11 10.4477 11 11V17C11 17.5523 10.5523 18 10 18C9.44772 18 9 17.5523 9 17V11C9 10.4477 9.44772 10 10 10Z"
									fill="#2E3238"
								></path>
								<path
									fill-rule="evenodd"
									clip-rule="evenodd"
									d="M14 10C14.5523 10 15 10.4477 15 11V17C15 17.5523 14.5523 18 14 18C13.4477 18 13 17.5523 13 17V11C13 10.4477 13.4477 10 14 10Z"
									fill="#2E3238"
								></path>
							</svg>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<div class="process-file__buttons">
		<button
			class={buttonsState.isUploadPreproccessedDisabled
				? 'src-components-button-___styles-module__Default___Lp0Il primary-button-disabled'
				: 'src-components-button-___styles-module__Default___Lp0Il'}
			disabled={buttonsState.isUploadPreproccessedDisabled}
			type="primary"
			onclick={() => downloadPreprocessedFile()}
		>
			Download preprocessed file</button
		>

		{#if !templateRecordState.sys_id}
			<button
				class={buttonsState.isUploadPreproccessedDisabled
					? 'src-components-button-___styles-module__Default___Lp0Il primary-button-disabled'
					: 'src-components-button-___styles-module__Default___Lp0Il'}
				onclick={() => generateTemplate(buttonsState, docxFiles)}
				disabled={buttonsState.isUploadPreproccessedDisabled}
			>
				Generate template
			</button>
		{:else}
			<button
				class="src-components-button-___styles-module__Default___Lp0Il process-file__button"
				onclick={() => generateTemplate(buttonsState)}
				disabled={false}
			>
				Update template
			</button>
		{/if}
	</div>
</div>

<style>
	.for-overflow-dropdown {
		max-height: 500px;
		overflow-y: scroll;
		position: absolute;
	}

	.src-components-customselect-___styles-module__menu___XQSV5:hover {
		background-color: #f2f2f2;
	}

	.black-bar {
		background-color: #000000; /* Use the hex code for black */
		height: 1px; /* Set a specific height */
		width: 100%;
		margin-bottom: 30px;
	}

	.upload-specification {
		display: flex;
		flex-direction: column;
		padding: 16px;
		border-radius: 4px;
		border: 1px solid #d5d8dd;
		gap: 16px;
		margin-bottom: 16px;
		max-width: 600px;
		margin: auto;
		width: 100%;
	}

	.upload-specification__title {
		display: flex;
		gap: 4px;
	}

	.upload-specification__title-text {
		font-size: 16px;
		font-weight: 600;
	}

	.upload-specification__content {
		font-size: 14px;
		font-style: normal;
		font-weight: 400px;
		line-height: 20px;
	}

	.upload-specification__content .content__downloadTemplate button {
		all: unset;
		cursor: pointer;
		color: #005999;
	}

	.upload-specification__content .content__downloadTemplate a {
		font-weight: 400;
		font-size: 14px;
		color: #005999;
	}

	.upload-specification__content .content__downloadTemplate a:hover {
		color: #005999;
		text-decoration-line: underline;
	}

	.upload-specification__content .content__downloadTemplate a:active {
		color: #5c6470;
		text-decoration-line: underline;
	}

	.upload-specification__content .content__rulesToGetStarted span {
		font-weight: 600;
		font-size: 14px;
	}

	#upload-container {
		display: flex;
		position: relative;
		padding: 16px;
		gap: 8px;
		justify-content: center;
		align-items: center;
		border: 2px dashed #d5d8dd;
		border-radius: 4px;
	}

	#upload-container img {
		width: 40%;
		margin-bottom: 20px;
		user-select: none;
	}

	#upload-container label {
		font-style: normal;
		font-weight: 600;
		font-size: 14px;
		line-height: 20px;
	}

	#upload-container:not(.dragover) .defaultState {
		position: relative;
		z-index: 10;
	}

	#upload-container .defaultState {
		display: flex;
		position: relative;
		gap: 8px;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;
	}

	#upload-container .dragoverState {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		background: #fff;
		visibility: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
	}

	#upload-container.dragover .dragoverState {
		visibility: visible;
	}

	#upload-container.dragover .defaultState {
		visibility: hidden;
	}

	.dragoverState__dragBoxIcon {
		margin-right: 8px;
	}

	.dragoverState__dragBoxIcon svg {
		display: block;
		width: 20px;
		height: 20px;
	}

	.dragoverState__dragBoxText {
		font-size: 14px;
		line-height: 20px;
		color: #0068b3;
	}

	#upload-container input[type='file'] {
		width: 0.1px;
		height: 0.1px;
		opacity: 0;
		position: absolute;
		z-index: -10;
	}

	#upload-container .custom-button {
		font-weight: 600;
		font-size: 14px;
		display: inline-block;
		vertical-align: top;
		text-align: center;
		border-radius: 4px;
		padding: 0 12px;
		line-height: 30px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		user-select: none;
		cursor: pointer;
		border: 1px solid;
		height: 32px;
		transition:
			background-color 0.1s ease-out,
			border-color 0.1s ease-out;
		color: #2e3238;
		border-color: #d5d8dd;
		background-color: #fff;
	}

	#upload-container .custom-button:active {
		border-color: #abb1ba;
		background-color: #d5d8dd;
	}

	#upload-container .custom-button:hover {
		background-color: #f1f2f3;
	}

	#upload-container .custom-button:disabled {
		background-color: #d5d8dd;
		border-color: #d5d8dd;
		color: #abb1ba;
		cursor: default;
		box-shadow: none;
	}

	#upload-container .custom-button:focus:not(:active) {
		border-color: #83b5fc !important;
		box-shadow: inset 0 0 1px 1px #83b5fc !important;
	}

	#upload-container.dragover {
		border: 2px dashed #0068b2;
	}

	.process-file__button {
		background-color: #0078cf;
		color: #ffffff;
	}

	.process-file__button:hover {
		background-color: #0068b2;
		border-color: #0068b2;
	}

	.process-file__button:active {
		background-color: #005999;
		border-color: #005999;
	}

	.process-file__buttons {
		display: flex;
		justify-content: space-between;
	}

	@media screen and (max-width: 767px) {
		.process-file__button,
		.start-again__button {
			width: 100%;
		}
	}

	.uploadedFileContainer {
		padding: 0 8px;
		border: 1px solid #d5d8dd;
		text-align: left;
		height: 40px;
		font-size: 14px;
		display: block;
		background: #fcfcfd;
		border-radius: 4px;
	}

	.uploadedFileContainer .uploadedFileContainer__fileContent {
		padding-top: 7px;
	}

	.uploadedFileContainer .uploadedFileContainer__fileContent > div:first-child {
		float: left;
	}

	.uploadedFileContainer .uploadedFileContainer__fileContent .uploadedFileContainer__fileParams {
		position: relative;
		margin-left: 32px;
		display: flex;
	}

	.uploadedFileContainer .uploadedFileContainer__fileContent .uploadedFileContainer__fileParams__fileName {
		flex: auto;
		position: relative;
		width: 100%;
		line-height: 24px;
		height: 24px;
	}

	.uploadedFileContainer .uploadedFileContainer__fileContent .uploadedFileContainer__fileParams__fileIcons {
		display: flex;
		cursor: pointer;
		flex: 0 0 8px;
		align-self: center;
	}

	.uploadedFileContainer .uploadedFileContainer__fileContent .uploadedFileContainer__fileParams__fileIcons svg {
		display: block;
		width: 16px;
		height: 16px;
	}

	.uploadedFileContainer__fileConten__fileContentIcon.green svg path {
		fill: #00662b;
	}

	.uploadedFileContainer .uploadedFileContainer__fileContent .uploadedFileContainer__fileParams__fileIcons svg path {
		fill: #abb1ba;
	}

	.uploadedFileContainer .uploadedFileContainer__fileContent .uploadedFileContainer__fileParams__fileIcons:hover svg path {
		fill: #2e3238;
	}

	#fileZone {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	#fileZone__errors {
		display: flex;
		position: relative;
		gap: 4px;
		align-items: flex-start;
		font-size: 12px;
	}

	.upload-specification__fileZone span {
		width: 90%;
	}

	#fileZone__errors span {
		color: #5c6470;
		margin-top: -2px;
	}

	.processing-specification {
		position: relative;
		background-color: #e5f4ff;
		padding: 16px 16px 16px 48px;
		border: 1px solid #99d5ff;
		border-radius: 4px;
	}

	.processing-specification__content {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
	}

	.processing-specification__wrap {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.processing-specification__svg {
		position: absolute;
		top: 18px;
		left: 16px;
	}

	.processing-specification__title,
	.processing-specification__hasntError-title,
	.processing-specification__hasError-title {
		font-weight: 600;
	}

	.processing-specification__description,
	.processing-specification__hasntError-description,
	.processing-specification__hasError-description {
		font-style: normal;
		font-weight: 400;
		font-size: 14px;
		line-height: 20px;
	}

	.phase {
		color: #5c6470;
		display: flex;
		align-items: flex-start;
		gap: 8px;
		align-self: stretch;
	}

	.phase_green {
		color: #00662b;
	}

	.phase_blue {
		color: #005999;
	}

	.processing-specification__description-title {
		display: inline;
		color: #2e3238;
	}

	.point {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	.check {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	.loader {
		width: 18px;
		height: 18px;
		display: inline-block;
		box-sizing: border-box;
		flex-shrink: 0;
		animation: rotation 1s linear infinite;
	}

	@keyframes rotation {
		0% {
			transform: rotate(0deg);
		}

		100% {
			transform: rotate(360deg);
		}
	}

	.loading:after {
		overflow: hidden;
		display: inline-block;
		vertical-align: bottom;
		-webkit-animation: ellipsis steps(4, end) 900ms infinite;
		animation: ellipsis steps(4, end) 900ms infinite;
		content: '\2026';
		width: 0px;
	}

	@keyframes ellipsis {
		to {
			width: 1.25em;
		}
	}

	@-webkit-keyframes ellipsis {
		to {
			width: 1.25em;
		}
	}

	.processing-specification__hasntError {
		border: 1px solid #b1f2cc;
		border-radius: 4px;
		background: #d9fae7;
	}

	.processing-specification__hasError {
		border: 1px solid #ffaa99;
		border-radius: 4px;
		background: #ffe9e5;
	}

	.processing-specification__hasntError-description button {
		all: unset;
		cursor: pointer;
	}

	.processing-specification__hasError-description button {
		all: unset;
		cursor: pointer;
	}

	.processing-specification__hasntError-description button:hover {
		text-decoration-line: underline;
	}

	.processing-specification__hasError-description button:hover {
		text-decoration-line: underline;
	}

	.processing-specification__hasntError-countErrors {
		color: #b21f00;
	}

	.link-to-list {
		color: #005999;
	}

	.link-to-list:hover {
		color: #005999;
		text-decoration-line: underline;
	}

	.link-to-list:active {
		color: #5c6470;
		text-decoration-line: underline;
	}

	.content__aboutRule {
		font-weight: bold;
		margin-top: 8px;
	}

	.uploadedFileContainer__fileParams .uploadedFileContainer__fileParams__fileName button {
		all: unset;
		cursor: pointer;
		color: #0086e5;
	}

	.uploadedFileContainer__fileParams .uploadedFileContainer__fileParams__fileName button:hover {
		text-decoration-line: underline;
	}

	@keyframes fadeOut {
		100% {
			opacity: 1;
		}

		0% {
			opacity: 0;
		}
	}

	@keyframes fadeIn {
		0% {
			opacity: 0;
		}

		1000% {
			opacity: 1;
		}
	}

	.outer-container {
		position: absolute;

		right: 100px;
		top: 100px;
		width: 500px;
	}

	.display-none {
		display: none;
	}

	.iframe-class {
		position: absolute;
		right: 600px;
		top: 100px;
	}

	.primary-button-disabled {
		background-color: #d5d8dd;
		border-color: #d5d8dd;
		color: #abb1ba;
		cursor: default;
		box-shadow: none;
	}
</style>
