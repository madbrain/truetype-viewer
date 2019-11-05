<div class="row">
    <div class="col-6">
        <form>
            <div class="form-group">
                <label for="pointSize">Point Size</label>
                <input type="number" class="form-control" id="pointSize"
                    aria-describedby="pointSize" placeholder="Enter point size" bind:value={pointSize}>
            </div>
            <div class="form-group">
                <label for="resolution">Resolution</label>
                <input type="number" class="form-control" id="resolution"
                    aria-describedby="resolution" placeholder="Enter resolution" bind:value={resolution}>
            </div>
            <div class="form-group">
                <label for="glyph">Glyph</label>
                <input type="text" class="form-control" id="glyph"
                    aria-describedby="glyph" placeholder="Enter glyph" bind:value={glyph}>
            </div>
        </form>
        <button type="button" class="btn btn-primary" on:click={step}>Step</button>
    </div>
    <div class="col-6">
        {#if engine && engine.glyphDefinition}
        <GlyphView glyphDefinition={engine.glyphDefinition} {highlight} />
        {/if}
    </div>
</div>

<script>

import { fontDefinition } from "./store";
import GlyphView from './GlyphView.svelte';
import { make } from "./truetype-engine";

let glyph = "g";
let pointSize = 18.0;
let resolution = 120;
let highlight = [ ];

$: engine = $fontDefinition ? make($fontDefinition, glyph, pointSize, resolution) : null;

function step() {
    // TODO modify highlight on execution
    engine.step();
}
</script>