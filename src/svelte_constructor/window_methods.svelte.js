export function onWindowClickToClosePopup(e, popupBoxRef) {
    let { target } = e;
    while (target && !target.getAttribute('dropdown')) {
        target = target.parentElement;
    }

    if (!target) {
        popupBoxRef.isPopupOpened = false;
    }


}

import { enableScroll, trackedOpenedInfoPopups } from './referenceField.svelte';
import { enableScrollBar } from './scrollableHandling.svelte';

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
        enableScroll();
        enableScrollBar();
    }
}

