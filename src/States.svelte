<div class="card card-outline-primary mt-2">
  <div class="card-header">
    <TabNavBar on:select={select} defaultItem={Memory}>
      <li class="nav-item">
        <TabNavLink label="Memory" item={Memory} />
      </li>
      <li class="nav-item">
        <TabNavLink label="Stack" item={Stack} />
      </li>
      <li class="nav-item">
        <TabNavLink label="Call Stack" item={CallStack} />
      </li>
    </TabNavBar>
  </div>
  <div class="card-body">
  <div class="overflow-auto with-scroller">
    {#if currentPage == Memory}
    <ul class="element-list">
      {#each state.memory as element, i}
      <li>[{i}] {element} ({element / 64})</li>
      {/each}
    </ul>
    {:else if currentPage == Stack}
    <ul class="element-list">
      {#each state.stack as element}
      <li>{element} ({element / 64})</li>
      {/each}
    </ul>
    {:else}
    <ul class="element-list">
      {#each state.callStack as element}
      <li>Function {element.fn} at {element.pc}{#if element.count > 0} (repeat: {element.count}){/if}</li>
      {/each}
    </ul>
    {/if}
  </div>
  </div>
</div>

<style>
.element-list {
  list-style: none;
}
.with-scroller {
  height: 500px; /* TODO use calc(100% - 400px) */
}
</style>

<script>
import {onDestroy} from 'svelte';
import TabNavBar from './TabNavBar.svelte';
import TabNavLink from './TabNavLink.svelte';
const Memory = 0;
const Stack = 1;
const CallStack = 2;

let currentPage = Memory;

function select(event) {
    currentPage = event.detail;
}

export let engine;
let state;
$: sub = engine.state.subscribe(_ => state = _);
onDestroy(() => sub.unsubscribe());
</script>