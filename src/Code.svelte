<div class="card card-outline-primary mt-2">
  <div class="card-header">Code</div>
  <div class="overflow-auto with-scroller">
    <ul class="list-group list-group-flush">
    {#each $state.instructions as instruction}
      <li class="list-group-item" class:selected={$state.pc == instruction.pc}>{instruction.pc} {instruction.label}</li>
    {/each}
    </ul>
  </div>
</div>

<style>
.with-scroller {
  height: 500px; /* TODO use calc(100% - 400px) */
}
.selected {
  background-color: aqua;
}
</style>

<script>
export let engine;
$: state = engine.state;
</script>