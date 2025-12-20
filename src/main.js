import { mount } from 'svelte';
import App from './main.svelte';

mount(App, {
    target: document.getElementById('outer-container')
});