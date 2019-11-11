<ul class="nav nav-tabs card-header-tabs">
<slot/>
</ul>

<script>
import {createEventDispatcher, onMount, onDestroy} from 'svelte';
import {currentTab} from './store';
export let defaultItem;

const dispatcher = createEventDispatcher();

onDestroy(currentTab.subscribe(value => {
    dispatcher('select', value);
}));

onMount(() => {
    currentTab.set(defaultItem);
});

</script>