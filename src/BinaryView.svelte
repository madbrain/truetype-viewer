<div class=binary-table>
  <BinaryTable {data} {visibleRow} let:row={row}>
    <div><b>{row.index}</b>
    {#if row.span}
        {row.content.slice(0, row.span.start).join(" ")}
        <span class="select">{row.content.slice(row.span.start, row.span.end).join(" ")}</span>
        {row.content.slice(row.span.end, row.content.length).join(" ")}
    {:else}
        {row.content.join(" ")}
    {/if}
    </div>
  </BinaryTable>
</div>

<style>
.binary-table {
    font-family: 'Courier New', Courier, monospace;
}
.select {
    background-color: rgb(215, 190, 240);
}
</style>

<script>
import { onDestroy } from 'svelte';
import { selection } from "./store";
import BinaryTable from './BinaryTable.svelte';

export let buffer;

let visibleRow;
let span;

$: data = makeRows(buffer, span);
$: addressSize = buffer.byteLength.toString(16).length + 1;

const unsubscribe = selection.subscribe(value => {
    if (value && value.span) {
        span = value.span;
        visibleRow = Math.trunc(value.span.start / 16);
    } else {
        span = null;
        visibleRow = null;
    }
});
onDestroy(unsubscribe);

function getRows(start, end, blocks) {
    const s = Math.min(start, blocks);
    const e = Math.min(end, blocks);
    return [...Array(e - s)].map((x, i) => {
        const result = [];
        for (let j = 0; j < 16; ++j) {
            const offset = (s + i) * 16 + j;
            if (offset < buffer.byteLength) {
                result.push(hex(buffer[offset], 2));
            } else {
                result.push("  ");
            }
        }
        let lineSpan = null;
        if (span) {
            const offset = (s + i) * 16;
            let spanStart = Math.min(offset + 16, Math.max(0, span.start - offset));
            let spanEnd = Math.min(offset + 16, Math.max(0, span.end - offset));
            if (spanStart != spanEnd) {
                lineSpan = { start: spanStart, end: spanEnd };
            }
        }
        return { index: hex((s + i) * 16, addressSize), content: result, span: lineSpan };
    });
}

function makeRows(buffer, span) {
    const blocks = Math.trunc((buffer.byteLength + 15) / 16);
    return { getRows: (s, e) => getRows(s, e, blocks), length: blocks }; 
}

function hex(x, size) {
   return (x + Math.pow(16, size)).toString(16).substr(-size).toUpperCase();
}
</script>