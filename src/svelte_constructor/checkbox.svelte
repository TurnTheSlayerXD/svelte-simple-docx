<script>
    const { title, onClickCheckbox } = $props();
</script>

<div style="flex: 1 1 auto; margin-top: 25px;">
    <div
        class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Field___BH07L src-components-dynamicForms-view-fieldWrapper-___styles-module__Checkbox___tUbWm"
        data-test="field-Use as replacement"
    >
        <div
            class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameWrap___STsiA"
        >
            <div
                class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Name___fSBsc"
            >
                <div
                    class="src-components-dynamicForms-view-fieldWrapper-___styles-module__NameText___Pc25B"
                    data-test="is_replacement_reserve-label"
                >
                    <span
                        class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Label___tjzWY + undefined"
                        ><span>{title}</span></span
                    >
                </div>
            </div>
        </div>
        <div
            class="src-components-dynamicForms-view-fieldWrapper-___styles-module__Input___bLmkj"
        >
            <div
                class="src-components-dynamicForms-view-field-checkbox-___styles-module__Checkbox___sskDi"
            >
                <label class=""
                    ><input
                        type="checkbox"
                        data-test="is_replacement_reserve-field-checkbox-checkbox"
                        value="0"
                        onclick={() => onClickCheckbox()}
                    /><span
                        class="src-components-dynamicForms-view-field-checkbox-___styles-module__icon___KprDA"
                        ><span
                            class="src-components-dynamicForms-view-field-checkbox-___styles-module__Check___kKbMW"
                            ><svg
                                width="8"
                                height="6"
                                viewBox="0 0 8 6"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M7.79092 1.20502C8.06969 0.929352 8.06969 0.482413 7.79092 0.206748C7.51215 -0.068916 7.06018 -0.068916 6.78141 0.206748L2.85533 4.29585L1.21859 2.67734C0.939819 2.40167 0.487846 2.40167 0.209077 2.67734C-0.0696923 2.953 -0.0696923 3.39994 0.209077 3.67561L2.35057 5.79325C2.62934 6.06892 3.08132 6.06892 3.36009 5.79325L7.79092 1.20502Z"
                                    fill="white"
                                ></path>
                            </svg>
                        </span></span
                    ></label
                >
            </div>
        </div>
    </div>
</div>
