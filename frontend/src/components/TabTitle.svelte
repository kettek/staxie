<script lang="ts">
  import type { LoadedFile } from '../types/file'
  import { Button } from 'carbon-components-svelte'
  import { Close } from 'carbon-icons-svelte'
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  export let file: LoadedFile

  function handleClose(e: Event) {
    e.preventDefault()
    dispatch('close', file)
  }
</script>

<main>
  <span>{$file.title.substring(0, $file.title.lastIndexOf('.')) || $file.title}</span>
  <aside>
    {#if !$file.saved()}*{/if}
  </aside>
  <Button size="small" kind="ghost" iconDescription="close" icon={Close} href="#" on:click={handleClose} />
</main>

<style>
  main {
    display: inline-grid;
    grid-template-columns: 9em auto minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: absolute;
    top: 0;
    left: 0;
  }
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    direction: rtl;
  }
</style>
