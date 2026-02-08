


export const scrollbaleHooks = [];

export function addScrollable(hook) {
    scrollbaleHooks.push(hook);
}

let lastScrollPos = { left: null, top: null };

function actPrevent(event) {
    const { target } = event;
    if (!(target instanceof HTMLElement)) {
        throw new Error();
    }
    target.scrollTo(lastScrollPos);
}

export function disableScrollBar() {
    console.log('scrollbaleHooks', scrollbaleHooks);
    for (const hook of scrollbaleHooks) {
        if (!(hook instanceof HTMLElement)) {
            throw new Error();
        }
        lastScrollPos = { left: hook.scrollLeft, top: hook.scrollTop };
        hook.addEventListener('scroll', actPrevent);
    }
}

export function enableScrollBar() {
    for (const hook of scrollbaleHooks) {
        if (!(hook instanceof HTMLElement)) {
            throw new Error();
        }
        hook.removeEventListener('scroll', actPrevent);
    }
}
