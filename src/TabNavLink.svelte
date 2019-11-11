<a class="nav-link" class:active={$currentTab == item} href="-" on:click={(e) => select(e)}>{label}</a>

<script>
import {currentTab} from './store';
export let label;
export let item;

function select(e) {
    e.preventDefault();
    currentTab.set(item);
}
</script>