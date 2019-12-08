<div bind:this={scrollArea} on:scroll={onScroll} class="clusterize-scroll">
  <div bind:this={contentArea} class="clusterize-content" tabindex="0">
    {#if data.length == 0}
    <div class="clusterize-no-data"><span>Loading data…</span></div>
    {:else}
      {#if positions.top_offset != 0}
      {#if keep_parity}
      <div class="clusterize-extra-row clusterize-keep-parity" />
      {/if}
      <div class="clusterize-extra-row" style="height: {positions.top_offset}px" />
      {/if}
    {#each data.getRows(positions.items_start, positions.items_end) as row, index}
      <slot row={row}></slot>
    {/each}
      {#if positions.bottom_offset != 0}
      <div class="clusterize-extra-row" style="height: {positions.bottom_offset}px" />
      {/if}
    {/if}
  </div>
</div>
<svelte:window on:resize={onResize}/>

<style>
.clusterize-scroll {
  max-height: 400px;
  overflow: auto;
}

.clusterize-extra-row {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

.clusterize-extra-row.clusterize-keep-parity {
  display: none;
}

.clusterize-content {
  outline: 0;
  counter-reset: clusterize-counter;
}

.clusterize-no-data span {
  text-align: center;
}
</style>

<script>

// https://github.com/NeXTs/Clusterize.js/blob/master/clusterize.js

import { onMount, afterUpdate } from "svelte";

let scrollArea;
let contentArea;

export let data = { length: 0, getRows: (start, end) => [] };
export let visibleRow;
export let rows_in_block = 50;
export let blocks_in_cluster = 4;
export let keep_parity = true;

let item_height;
let rows_in_cluster;
let block_height;
let cluster_height;
let last_cluster;
let resize_debounce = 0;

let positions = {
  top_offset: 0,
  bottom_offset: 0,
  rows_above: 0,
  items_start: 0,
  items_end: 0,
};

onMount(() => {
  positions = {...positions, items_end: Math.min(10, data.length) };
  setTimeout(() => {
    insertToDOM(data.length);
  }, 100);
});

afterUpdate(() => {
  if (visibleRow) {
    const position = visibleRow * item_height;
    const scrollBottom = scrollArea.scrollTop + scrollArea.offsetHeight;
    if (! (scrollArea.scrollTop <= position && position < scrollBottom)) {
      scrollArea.scrollTop = position;
    }
  }
});

function onScroll() {
  if (last_cluster != (last_cluster = getClusterNum())) {
    insertToDOM(data.length);
  }
}

function onResize() {
  clearTimeout(resize_debounce);
  resize_debounce = setTimeout(refresh, 100);
}

function refresh() {
  if(getRowsHeight(data.length) || force) {
    // TODO update(rows);
  }
}

function update(new_rows) {
  rows = isArray(new_rows)
    ? new_rows
    : [];
  const scroll_top = scrollArea.scrollTop;
  if(rows.length * item_height < scroll_top) {
    scrollArea.scrollTop = 0;
    last_cluster = 0;
  }
  insertToDOM(data.length);
  scrollArea.scrollTop = scroll_top;
}

function insertToDOM(rows_len) {
  if( ! cluster_height) {
    getRowsHeight(rows_len);
  }
  positions = generate(rows_len, getClusterNum());
}

function generate(rows_len, cluster_num) {
  if (rows_len < rows_in_block) {
    return {
      items_start: 0,
      items_end: rows_len,
      top_offset: 0,
      bottom_offset: 0,
      rows_above: 0,
    };
  }
  const items_start = Math.max((rows_in_cluster - rows_in_block) * cluster_num, 0);
  const items_end = items_start + rows_in_cluster;
  const top_offset = Math.max(items_start * item_height, 0);
  const bottom_offset = Math.max((rows_len - items_end) * item_height, 0);
  let rows_above = items_start;
  if (top_offset < 1) {
    rows_above++;
  }
  return {
    items_start: items_start,
    items_end: items_end,
    top_offset: top_offset,
    bottom_offset: bottom_offset,
    rows_above: rows_above,
  };
}

function getRowsHeight(rows_len) {
  const prev_item_height = item_height;
  cluster_height = 0;
  if (rows_len == 0) return;
  const nodes = contentArea.children;
  if(nodes.length == 0) return;
  const node = nodes[Math.floor(nodes.length / 2)];
  item_height = node.offsetHeight;
  const marginTop = parseInt(getStyle('marginTop', node), 10) || 0;
  const marginBottom = parseInt(getStyle('marginBottom', node), 10) || 0;
  item_height += Math.max(marginTop, marginBottom);
  block_height = item_height * rows_in_block;
  rows_in_cluster = blocks_in_cluster * rows_in_block;
  cluster_height = blocks_in_cluster * block_height;
  return prev_item_height != item_height;
}

function getClusterNum() {
  const scroll_top = scrollArea.scrollTop;
  return Math.floor(scroll_top / (cluster_height - block_height)) || 0;
}

function getStyle(prop, elem) {
  return window.getComputedStyle ? window.getComputedStyle(elem)[prop] : elem.currentStyle[prop];
}
</script>