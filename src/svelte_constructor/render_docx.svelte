
<script>
    const { templateFields, templateTableColumns } = $props();

    const state = $state({ isShow: false });

    const CONTAINER_HEIGHT = 600,
        CONTAINER_WIDTH = 500;

    const rect = document
        .querySelector("#root > span > div > header")
        .getBoundingClientRect();
    let top = rect.height;
    let right = 0;

    let containerHook = $state();
    let docxHook = $state();

    let cornerLeft, cornerTop;

    $effect(() => {
        if (state.isShow) {
            let { left, top } = containerHook.getBoundingClientRect();
            (cornerLeft = left), (cornerTop = top);
        }
    });

    let u, v;
    let oldMat = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    let tingle;
    const TINGLE_TIMEOUT = 20;
    const K_MOD = 0.003;
    const ZOOM_MAX_K = 4;
    const ZOOM_MIN_K = 0.2;

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

    function onWheel(event) {
        event.preventDefault();
        event.stopPropagation();

        if (tingle) {
            return;
        }
        tingle = true;
        setTimeout(() => {
            tingle = false;
        }, TINGLE_TIMEOUT);

        const k = 1 + event.deltaY * -K_MOD;
        const modMat = [k, 0, (1 - k) * u, 0, k, (1 - k) * v, 0, 0, 1];
        const newMat = matMul(modMat, oldMat);
        const kZoom = newMat[0];
        if (kZoom > ZOOM_MAX_K || kZoom < ZOOM_MIN_K) {
            return;
        }
        docxHook.style.transform = `matrix(${newMat[0]},${newMat[3]},${newMat[1]},${newMat[4]},${newMat[2]},${newMat[5]})`;
        oldMat = newMat;
    }

    let isInsideDocx = false;
    let isMouseClicked = false;
    let prev_u, prev_v;
    let mouseMoveTingle = false;
    function onMouseMove(event) {
        event.preventDefault();
        event.stopPropagation();
        if (mouseMoveTingle) {
            return;
        }
        mouseMoveTingle = true;
        setTimeout(() => (mouseMoveTingle = false), 10);

        u = event.clientX - cornerLeft;
        v = event.clientY - cornerTop;
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
        document.body.style.overflow = "hidden";
        isInsideDocx = true;
    }
    function containerOnMouseLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        document.body.style.overflow = "unset";
        isInsideDocx = false;
        isMouseClicked = false;
    }

    function onMouseDown(event) {
        event.preventDefault();
        event.stopPropagation();
        if (isInsideDocx) {
            isMouseClicked = true;
        }
        prev_u = event.clientX - cornerLeft;
        prev_v = event.clientY - cornerTop;
    }
    function onMouseUp(event) {
        event.preventDefault();
        event.stopPropagation();
        isMouseClicked = false;
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="container"
    style:top={`${top}px`}
    style:right={`${right}px`}
    style:max-width={CONTAINER_WIDTH + "px"}
    style:max-height={CONTAINER_HEIGHT + "px"}
    bind:this={containerHook}
    onmouseenter={containerOnMouseEnter}
    onmouseleave={containerOnMouseLeave}
>
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button
        class="src-components-button-___styles-module__Default___Lp0Il const-btn"
        style="z-index:20;"
        onclick={() => {
            state.isShow = !state.isShow;
        }}
    >
        Show edited document
    </button>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        id="docx-render-root"
        class="docx-container"
        style:display={state.isShow ? "block" : "none"}
        bind:this={docxHook}
        onwheel={onWheel}
        onmousemovecapture={onMouseMove}
        onmousedowncapture={onMouseDown}
        onmouseupcapture={onMouseUp}
        ondragcapture={(event) => {
            event.preventDefault();
            event.stopPropagation();
        }}
    ></div>
</div>

<style>
    .container {
        position: fixed;
        z-index: 20;
        top: 48px;
        right: 0px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow:
            0px 4px 6px rgba(0, 0, 0, 0.1),
            0px 1px 4px rgba(0, 0, 0, 0.16);
    }

    .const-btn {
        width: 100%;
        flex: none;
    }

    .docx-container {
        transition: transform 0.2s ease;
        transform-origin: left top;
        width: 100%;
        height: 100%;
    }
</style>
