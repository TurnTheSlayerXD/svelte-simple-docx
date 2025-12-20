import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div>Hello, from Svelte</div>`);

export default function svelte_component($$anchor) {
	console.log("Hello, world");

	var div = root();

	$.append($$anchor, div);
}

$.create_custom_element(svelte_component, {}, [], [], true);