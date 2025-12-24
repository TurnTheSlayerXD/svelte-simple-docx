<script>
    let { binding, readonly } = $props();
</script>

<div
    class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Input___bLmkj"
    style:width="fit-content"
>
    <div
        class="src-components-dynamicForms-view-field-reference-___styles-module__ReferenceWrap___eRJAI"
    >
        <!-- svelte-ignore a11y_consider_explicit_label -->
        <div
            class="  src-components-dynamicForms-view-field-reference-___styles-module__Reference____LE_r"
        >
            <div
                class="src-components-dynamicForms-view-field-reference-___styles-module__input___ugSOq"
            >
                <div
                    class="src-components-dynamicForms-view-field-reference-___styles-module__FieldWrap___vC5cf"
                >
                    <div style="flex: 1 1 auto;">
                        <div
                            class="src-components-dynamicForms-view-field-stringInput-___styles-module__Input___SngSj"
                        >
                            <input
                                tabindex="20"
                                type="text"
                                bind:value={binding}
                                {readonly}
                            />
                        </div>
                    </div>
                    <div
                        class="src-components-dynamicForms-view-field-reference-___styles-module__Field___usWmV src-components-dynamicForms-view-field-reference-___styles-module__Hidden___ngVHd"
                    >
                        <button
                            type="button"
                            class="src-components-dynamicForms-view-field-reference-___styles-module__FieldOverlay___flsnR"
                            tabindex="20"
                        ></button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
