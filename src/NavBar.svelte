<nav class="navbar navbar-expand-md navbar-dark bg-dark fixed-top">
  <a class="navbar-brand" href="/" use:link>TrueTypeViewer</a>
  <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarsExampleDefault" aria-controls="navbarsExampleDefault" aria-expanded="false" aria-label="Toggle navigation">
    <span class="navbar-toggler-icon"></span>
  </button>

  <div class="collapse navbar-collapse" id="navbarsExampleDefault">
    <ul class="navbar-nav mr-auto">
      <RouterNavLink label="Binary" href="/" />
      <RouterNavLink label="Glyph" href="/glyph" />
    </ul>
  </div>
</nav>

<script>
  import RouterNavLink from './RouterNavLink.svelte';
  import { link } from 'svelte-spa-router';
</script>