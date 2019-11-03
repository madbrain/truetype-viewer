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
    </div>
    <div class="col-6">
        {#if glyphDefinition}
        <GlyphView glyphDefinition={glyphDefinition} scale={scale}/>
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

$: glyphDefinition = $fontDefinition ? $fontDefinition.getGlyph(glyph) : null;
$: scale = $fontDefinition ? $fontDefinition.scale(pointSize, resolution) : 0.1;
$: engine = $fontDefinition ? make($fontDefinition) : null;

</script>