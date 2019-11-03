<div class="row">
    <div class="col-6">
        <form>
            <div class="custom-file">
                <input type="file" class="custom-file-input" id="trueTypeFile"
                        accept=".ttf" bind:files={files} on:change={fileChange}>
                <label class="custom-file-label" for="trueTypeFile">{fileText || "Choose TrueType file"}</label>
            </div>
        </form>
        {#if $fontDefinition}
        <Tree tree={$fontDefinition.tree} />
        {/if}
    </div>
    <div class="col-6">
        <p>Binary view</p>
    </div>
</div>

<script>

import { fontDefinition } from "./store";
import { read } from "./truetype-reader";
import Tree from "./Tree.svelte"

let files;
let fileText;

function fileChange() {
    fileText = files[0].name;
    const fr = new FileReader();
    fr.onload = event => {
        $fontDefinition = read(event.target.result);
    };
    fr.readAsArrayBuffer(files[0]);
}

</script>