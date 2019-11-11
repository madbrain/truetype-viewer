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
    {#if currentPage == Memory}
    <p class="card-text">Memory</p>
    {:else if currentPage == Stack}
    <p class="card-text">Stack</p>
    {:else}
    <p class="card-text">Call Stack</p>
    {/if}
  </div>
</div>

<script>
import TabNavBar from './TabNavBar.svelte';
import TabNavLink from './TabNavLink.svelte';
const Memory = 0;
const Stack = 1;
const CallStack = 2;

let currentPage = Memory;

function select(event) {
    currentPage = event.detail;
}
</script>