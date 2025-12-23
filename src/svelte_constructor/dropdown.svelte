<script>
    let {
        optionField,
        optionSource,
        trackedButtons,
        fieldTitle,
        getFieldTitleCallback,
        getOptionTitleCallback,

        onBeforeOptionSelectCallback,
    } = $props();
    (() => {
        trackedButtons.push(optionField);
    })();

    function onChooseColumnClick(optionField) {
        for (const btn of trackedButtons.filter((btn) => btn !== optionField)) {
            btn.isOptionsOpened = false;
        }

        // console.log('optionSource', optionSource);
        // optionField.isOptionsOpened = true;

        const { fieldHook, optionsHook } = optionField;
        optionField.isOptionsOpened = !optionField.isOptionsOpened;
        // optionsHook.style.width = fieldHook.offsetWidth + "px";

        optionsHook.style.minWidth = fieldHook.offsetWidth + "px";
        optionsHook.style.left = fieldHook.offsetLeft + "px";
        optionsHook.style.top =
            fieldHook.offsetTop + fieldHook.offsetHeight + "px";
    }

    function onSelectNewValue(optionField, column) {
        if (onBeforeOptionSelectCallback) {
            onBeforeOptionSelectCallback(optionField, column);
        }
        optionField.currentOption = column;
        optionField.isOptionsOpened = false;
    }
</script>

<div style="flex: 1 1 auto; max-width: 200px;">
    <div
        class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Field___BH07L"
        bind:this={optionField.fieldHook}
    >
        <div
            class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameWrap___STsiA"
        >
            <div
                class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Name___fSBsc"
            >
                <div
                    class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameText___Pc25B"
                >
                    <span
                        class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Label___tjzWY + undefined"
                        ><span
                            >{!getFieldTitleCallback
                                ? fieldTitle
                                : getFieldTitleCallback(optionField)}</span
                        ></span
                    >
                </div>
            </div>
        </div>
        <div
            class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Input___bLmkj"
            dropdown="true"
        >
            <div
                class="src-components-dynamicForms-view-field-select-___styles-module__Input___GDQ_t"
            >
                <div
                    class="src-components-customselect-___styles-module__container___rnMJM"
                >
                    <button
                        type="button"
                        class="src-components-customselect-___styles-module__input___M2cpK"
                        tabindex="13"
                        onclick={() => onChooseColumnClick(optionField)}
                        ><span
                            class="src-components-customselect-___styles-module__inputText___J9u6h"
                        >
                            {!getOptionTitleCallback
                                ? optionField.currentOption?.title
                                : getOptionTitleCallback(
                                      optionField.currentOption,
                                  )}
                        </span><span
                            class="src-components-customselect-___styles-module__inputChevron___eSi_J"
                            ><svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
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
<div
    class="src-components-dropdown-___styles-module__Dropdown___y_t3K for-overflow-dropdown"
    style="min-width: unset !important;
                box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1), 0px 1px 4px rgba(0, 0, 0, 0.16);"
    dropdown="true"
    style:display={optionField.isOptionsOpened ? "initial" : "none"}
    bind:this={optionField.optionsHook}
>
    {#if optionSource}
        {#each optionSource as column}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            {#if (() => {
                return optionField.currentOption === column;
            })()}
                <div
                    class="src-components-customselect-___styles-module__menu___XQSV5"
                    style:background-color="#e7f0fe"
                    onclick={() => onSelectNewValue(optionField, column)}
                >
                    <div
                        class="src-components-customselect-___styles-module__menuItem___UqKfM"
                    >
                        {column.title}
                    </div>
                </div>
            {:else}
                <div
                    class="src-components-customselect-___styles-module__menu___XQSV5"
                    onclick={() => onSelectNewValue(optionField, column)}
                >
                    <div
                        class="src-components-customselect-___styles-module__menuItem___UqKfM"
                    >
                        {column.title}
                    </div>
                </div>
            {/if}
        {/each}
    {/if}
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
</style>

