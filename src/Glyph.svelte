<div class="row">
    <div class="col-6">
        <form>
            <div class="form-row">
                <div class="col-4">
                    <label for="pointSize">Point Size</label>
                    <input type="number" class="form-control" id="pointSize"
                        aria-describedby="pointSize" placeholder="Enter point size" bind:value={pointSize}>
                </div>
                <div class="col-4">
                    <label for="resolution">Resolution</label>
                    <input type="number" class="form-control" id="resolution"
                        aria-describedby="resolution" placeholder="Enter resolution" bind:value={resolution}>
                </div>
                <div class="col-4">
                    <label for="glyph">Glyph</label>
                    <input type="text" class="form-control" id="glyph"
                        aria-describedby="glyph" placeholder="Enter glyph" bind:value={glyph}>
                </div>
            </div>
        </form>
        {#if engine && engine.hasGlyph}
        <div class="btn-toolbar mt-2" role="toolbar">
            <div class="btn-group mr-2" role="group">
                <button type="button" class="btn btn-primary" on:click={stepInto}>Step Into</button>
                <button type="button" class="btn btn-primary" on:click={step}>Step</button>
                <button type="button" class="btn btn-primary" on:click={stepOut}>Step Out</button>
            </div>
        </div>
        
        <div class="row">
            <div class="col-6">
                <Code {engine} />
            </div>
            <div class="col-6">
                <States {engine} />
            </div>
        </div>
        {/if}
    </div>
    <div class="col-6">
        {#if engine && engine.hasGlyph}
        <GlyphViewWrapper engine={engine} />
        {/if}
    </div>
</div>

<script>

import { fontDefinition } from "./store";
import GlyphViewWrapper from './GlyphViewWrapper.svelte';
import Code from './Code.svelte';
import States from './States.svelte';
import { make } from "./truetype-engine";

let glyph = "g";
let pointSize = 18.0;
let resolution = 120;

$: engine = $fontDefinition ? make($fontDefinition, glyph, pointSize, resolution) : null;

function stepInto() {
    // TODO modify highlight on execution
    engine.stepInto();
}
function step() {
    // TODO modify highlight on execution
    engine.step();
}
function stepOut() {
    // TODO modify highlight on execution
    engine.stepOut();
}
</script>