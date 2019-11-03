<NavBar name="Template"/>

<main role="main" class="container-fluid">

  <div class="starter-template">
    <Router {routes}/>
  </div>

</main><!-- /.container -->

<style>
:global(body) {
  padding-top: 5rem;
}
.starter-template {
  padding: 3rem 1.5rem;
}
</style>

<script>
    import NavBar from './NavBar.svelte';
    import Binary from './Binary.svelte';
    import Glyph from './Glyph.svelte';
    import Router from 'svelte-spa-router';

    let routes = {
        '/': Binary,
        '/glyph': Glyph,
    };
</script>