<GlyphView glyphDefinition={state.glyph} />

<script>
import GlyphView from './GlyphView.svelte';
import {onDestroy} from 'svelte';
export let engine;
let state;
$: sub = engine.state.subscribe(_ => state = _);
onDestroy(() => sub.unsubscribe());
</script>