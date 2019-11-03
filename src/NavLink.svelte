<li class="nav-item" use:active={href, 'active'}>
     <a class="nav-link" href="{href}" use:link>{label}</a>
</li>

<script>
    import { link } from 'svelte-spa-router';
    import active from 'svelte-spa-router/active';
    export let label;
    export let href;
</script>