<form class="col-3 mb-2">
    <div class="custom-file">
        <input type="file" class="custom-file-input" id="trueTypeFile"
                accept=".ttf" bind:files={files} on:change={fileChange}>
        <label class="custom-file-label" for="trueTypeFile">{fileText || "Choose TrueType file"}</label>
    </div>
</form>

{#if $fontDefinition}
<div class="col-4">
    <div class="card mb-2">
        <div class="card-header">Info</div>
        <ul class="list-group list-group-flush">
            <li class="list-group-item">Name: {$fontDefinition.names.get(1)}</li>
            <li class="list-group-item">Style: {$fontDefinition.names.get(2)}</li>
            <li class="list-group-item">Version: {$fontDefinition.names.get(5)}</li>
            <li class="list-group-item">Copyright: {$fontDefinition.names.get(0)}</li>
        </ul>
    </div>
</div>
<div class="row">
    <div class="col-6">
        <Tree tree={$fontDefinition.tree} />
    </div>
    <div class="col-6">
        <p>Binary view</p>
    </div>
</div>
{/if}

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