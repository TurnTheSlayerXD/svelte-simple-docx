<script module>
	import * as docxRenderLib from '../../docxjs/dist/docx-preview.mjs';

	function matMul(lhs, rhs) {
		let a = lhs[0] * rhs[0] + lhs[1] * rhs[3] + lhs[2] * rhs[6];
		let b = lhs[0] * rhs[1] + lhs[1] * rhs[4] + lhs[2] * rhs[7];
		let c = lhs[0] * rhs[2] + lhs[1] * rhs[5] + lhs[2] * rhs[8];

		let d = lhs[3] * rhs[0] + lhs[4] * rhs[3] + lhs[5] * rhs[6];
		let e = lhs[3] * rhs[1] + lhs[4] * rhs[4] + lhs[5] * rhs[7];
		let f = lhs[3] * rhs[2] + lhs[4] * rhs[5] + lhs[5] * rhs[8];

		let g = lhs[6] * rhs[0] + lhs[7] * rhs[3] + lhs[8] * rhs[6];
		let h = lhs[6] * rhs[1] + lhs[7] * rhs[4] + lhs[8] * rhs[7];
		let i = lhs[6] * rhs[2] + lhs[7] * rhs[5] + lhs[8] * rhs[8];

		return [a, b, c, d, e, f, g, h, i];
	}

	export async function doDocxRendering(blob) {
		const docxRenderRoot = document.getElementById('docx-render-root');
		const rsp = await docxRenderLib.renderAsync(blob, docxRenderRoot);

		return 'docx-render-root';
	}
</script>

<script>
	const state = $state({ isShow: false });

	const { docxTemplateState = $bindable() } = $props();

	const CONTAINER_HEIGHT = document.body.offsetHeight,
		CONTAINER_WIDTH = 700;

	const rect = document.querySelector('#root > span > div > header').getBoundingClientRect();
	let top = rect.height;
	let right = 0;

	let containerHook = $state();
	let docxHook = $state();
	let buttonHook = $state();

	let tingle;
	const TINGLE_TIMEOUT = 20;
	const K_MOD = 0.002;
	const ZOOM_MAX_K = 4;
	const ZOOM_MIN_K = 0.2;

	let u, v;
	let oldMat = [1, 0, 0, 0, 1, 0, 0, 0, 1];
	let kZoom = 1;
	function onWheel(event) {
		event.preventDefault();
		event.stopPropagation();

		// if (tingle) {
		// 	return;
		// }
		// tingle = true;
		// setTimeout(() => {
		// 	tingle = false;
		// }, TINGLE_TIMEOUT);

		const k = 1 + event.deltaY * -K_MOD;

		const { left: containerLeft, top: containerTop } = containerHook.getBoundingClientRect();
		const { width: btnWidth, height: btnHeight } = buttonHook.getBoundingClientRect();

		const tr_u = u - containerLeft + containerHook.scrollLeft;
		const tr_v = v - containerTop + containerHook.scrollTop - btnHeight;

		const modMat = [k, 0, (1 - k) * tr_u, 0, k, (1 - k) * tr_v, 0, 0, 1];
		const newMat = matMul(modMat, oldMat);

		kZoom = newMat[0];

		if (kZoom > ZOOM_MAX_K || kZoom < ZOOM_MIN_K) {
			return;
		}

		docxHook.style.transform = `matrix(${newMat[0]},${newMat[3]},${newMat[1]},${newMat[4]},${newMat[2]},${newMat[5]})`;

		oldMat = newMat;
	}

	let isInsideDocx = false;
	let isMouseClicked = false;

	let prev_u = null;
	let prev_v = null;

	function onMouseMove(event) {
		event.preventDefault();
		event.stopPropagation();

		u = event.clientX;
		v = event.clientY;

		if (prev_u === null) {
			prev_u = u;
			prev_v = v;
			return;
		}

		if (isMouseClicked && isInsideDocx) {
			const modMat = [1, 0, u - prev_u, 0, 1, v - prev_v, 0, 0, 1];
			const newMat = matMul(modMat, oldMat);
			docxHook.style.transform = `matrix(${newMat[0]},${newMat[3]},${newMat[1]},${newMat[4]},${newMat[2]},${newMat[5]})`;
			oldMat = newMat;
		}
		prev_u = u;
		prev_v = v;
	}

	function containerOnMouseEnter(event) {
		event.preventDefault();
		event.stopPropagation();
		isInsideDocx = true;
	}
	function containerOnMouseLeave(event) {
		event.preventDefault();
		event.stopPropagation();
		isInsideDocx = false;
		isMouseClicked = false;
	}
	function onMouseDown(event) {
		event.preventDefault();
		event.stopPropagation();
		if (isInsideDocx) {
			isMouseClicked = true;
		}
	}
	function onMouseUp(event) {
		event.preventDefault();
		event.stopPropagation();
		isMouseClicked = false;
	}

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="container" bind:this={containerHook}>
	<!-- svelte-ignore a11y_consider_explicit_label -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div id="docx-render-root" class="docx-container" bind:this={docxHook}></div>
</div>

<style>
	.container {
		height: 100%;
		overflow: scroll;
		width: fit-content;
		z-index: 20;
		display: flex;
		flex-direction: column;
		box-shadow:
			0px 4px 6px rgba(0, 0, 0, 0.1),
			0px 1px 4px rgba(0, 0, 0, 0.16);
	}

	.const-btn {
		width: 100%;
		flex: none;
		position: sticky;
		top: 0;
	}

	.docx-container {
		transition: transform 0.01s ease;
		transform-origin: left top;
		width: fit-content;
		height: fit-content;
	}

	.empty {
		width: 0;
		height: 0;
	}
</style>
