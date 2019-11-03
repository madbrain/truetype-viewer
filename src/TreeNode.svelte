<li>
    <span class:caret={node.children && node.children.length > 0} class:caret-down={expanded} on:click={toggle}></span>
    <span class="label" class:selected={selected} on:click={select}>{node.label}</span>
    {#if node.children && node.children.length > 0}
    <ul class="nested" class:active={expanded}>
        {#each node.children as child}
        <svelte:self node={child} />
        {/each}
    </ul>
    {/if}
</li>

<style>
span {
    font-family: Arial, Helvetica, sans-serif;
}

ul {
  list-style-type: none;
  padding-inline-start: 20px;
}

.caret {
  cursor: pointer; 
  user-select: none;
}

.label {
    cursor: pointer;
}

.selected {
  background-color: rgb(215, 190, 240);
}

.caret::before {
  content: "\25B6";
  color: black;
  display: inline-block;
  margin-right: 6px;
}

.caret-down::before {
  transform: rotate(90deg); 
}

.nested {
  display: none;
}

.active {
  display: block;
}
</style>

<script>
  import { selection } from "./store";
  export let node;
  export let expanded = false;
  $: selected = $selection === node;

  function toggle() {
    expanded = !expanded;
  }

  function select() {
     $selection = node;
  }
</script>