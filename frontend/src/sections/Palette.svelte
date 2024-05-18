<!--
  @component
  
  This component shows swatches of a given palette and provides controls for selecting, moving, and deleting swatches.
-->
<script lang='ts'>
  import type { Color } from '../types/palette'
  import { ReplaceSwatchUndoable, type LoadedFile, AddSwatchUndoable, MoveSwatchUndoable } from '../types/file'
  import { createEventDispatcher } from 'svelte'
  import type { Undoable } from '../types/undo'
  import { ContextMenu, ContextMenuOption, OverflowMenu, OverflowMenuItem } from 'carbon-components-svelte';
  import DeletePaletteEntryModal from '../components/DeletePaletteEntryModal.svelte'
  
  import { brushSettings } from '../stores/brush'

  export let file: LoadedFile
  let lastFile: LoadedFile
  export let refresh: {}
  $: { refresh ? file = file : null }
  
  const dispatch = createEventDispatcher()

  export let fakePalette: Uint32Array | undefined
  let palette: Uint32Array | undefined[]
  $: {
    if (fakePalette) {
      palette = fakePalette
    } else {
      palette = $file ? $file.canvas.palette : []
    }
  }
  
  function paletteClick(event: MouseEvent) {
    if (event.button === 2) {
      return
    }
    const target = event.target as HTMLSpanElement
    const index = parseInt(target.getAttribute('x-index') || '0')
    if (event.shiftKey) {
      $brushSettings.secondaryIndex = index
      dispatch('select', { index: $brushSettings.secondaryIndex })
    } else {
      $brushSettings.primaryIndex = index
      dispatch('select', { index: $brushSettings.primaryIndex })
    }
  }
  function handleWheel(event: WheelEvent) {
    if (event.deltaX < 0) {
      $brushSettings.secondaryIndex = ($brushSettings.secondaryIndex - 1 + palette.length) % palette.length
    } else if (event.deltaX > 0) {
      $brushSettings.secondaryIndex = ($brushSettings.secondaryIndex + 1) % palette.length
    }
    if (event.deltaY < 0) {
      $brushSettings.primaryIndex = ($brushSettings.primaryIndex - 1 + palette.length) % palette.length
    } else if (event.deltaY > 0) {
      $brushSettings.primaryIndex = ($brushSettings.primaryIndex + 1) % palette.length
    }
  }

  let draggingIndex: number = -1
  let hoveringIndex: number = -1
  function swatchDrag(node) {
    let index = parseInt(node.getAttribute('x-index') || '-1')
    let x = 0
    let y = 0
    let dx = 0
    let dy = 0
    node.addEventListener('mousedown', start)

    function start(e: MouseEvent) {
      e.preventDefault()
      x = e.clientX
      y = e.clientY

      window.addEventListener('mouseup', stop)
      window.addEventListener('mouseleave', stop)
      window.addEventListener('mousemove', move)
    }
    function stop(e: MouseEvent) {
      if (hoveringIndex !== -1 && hoveringIndex !== draggingIndex) {
        file.push(new MoveSwatchUndoable(draggingIndex, hoveringIndex<draggingIndex?hoveringIndex:hoveringIndex-1))
      }

      draggingIndex = -1
      hoveringIndex = -1
      window.removeEventListener('mouseup', stop)
      window.removeEventListener('mouseleave', stop)
      window.removeEventListener('mousemove', move)
    }
    function move(e: MouseEvent) {
      dx += e.clientX - x
      dy += e.clientY - y

      x = e.clientX
      y = e.clientY

      if (Math.abs(dx)+Math.abs(dy) < 5) {
        return
      }
      draggingIndex = index

      for (let i = 0; i < $file.canvas.palette.length; i++) {
        const entry = document.querySelector(`.entry[x-index="${i}"]`) as HTMLSpanElement
        if (!entry) continue
        const rect = entry.getBoundingClientRect()
        if (x > rect.left && x < rect.right && y > rect.top && y < rect.bottom) {
          hoveringIndex = i+1
          break
        }
      }
    }
  }
  
  let showDeleteDialog: boolean = false
  let targetIndex: number = -1
  function onContextMenu(e: CustomEvent) {
    targetIndex = parseInt((e.detail as HTMLSpanElement).getAttribute('x-index') || '-1')
  }
  function showDeleteSwatchDialog(e: CustomEvent) {
    showDeleteDialog = true
  }
  
  // These are entry refs for sharing the ContextMenu.
  let _refs = []
  $: refs = _refs.filter(Boolean)
</script>

<main on:wheel={handleWheel}>
  {#each palette as swatch, swatchIndex}
    {#if draggingIndex !== -1 && (swatchIndex === hoveringIndex || (swatchIndex === hoveringIndex-1 && swatchIndex === palette.length-1))}
      <span class="entry primary">
        <span class="checkerboard"></span>
        <span style="background-color: rgba({palette[draggingIndex]&0xFF},{(palette[draggingIndex]>>8)&0xFF},{(palette[draggingIndex]>>16)&0xFF},{((palette[draggingIndex]>>24)&0xFF)/255})" class="color"></span>
        <span class='label'>{draggingIndex}</span>
      </span>
    {/if}
    {#if swatchIndex !== draggingIndex}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <span bind:this={_refs[swatchIndex]} on:click={paletteClick} x-index={swatchIndex} class='entry{swatchIndex===$brushSettings.primaryIndex?' primary':''}{swatchIndex===$brushSettings.secondaryIndex?' secondary':''}{swatchIndex===draggingIndex?' hide':''}' use:swatchDrag on:contextmenu|preventDefault>
        <span class="checkerboard"></span>
        <span style="background-color: rgba({swatch&0xFF},{(swatch>>8)&0xFF},{(swatch>>16)&0xFF},{((swatch>>24)&0xFF)/255})" class="color"></span>
        <span class='label'>{swatchIndex}</span>
      </span>
    {/if}
  {/each}
  <ContextMenu target={_refs} on:open={onContextMenu}>
    <ContextMenuOption labelText="Delete..." on:click={showDeleteSwatchDialog} kind='danger' />
  </ContextMenu>
  <DeletePaletteEntryModal bind:open={showDeleteDialog} paletteIndex={targetIndex} file={file}/>
</main>

<style>
  main {
    background-color: var(--cds-background-selected);
    text-align: left;
    user-select: none;
    overflow: auto;
    padding: 1px;
  }
  .entry {
    position: relative;
    display: inline-block;
    width: 2em;
    height: 2em;
  }
  .entry.hide {
    display: none;
  }
  .entry.primary {
    outline: 1px dashed white;
  }
  .entry.secondary {
    border: 2px dashed black;
  }
  .color {
    pointer-events: none;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  .checkerboard {
    pointer-events: none;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 100%;
    background-image: linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%);
    background-size: 10px 10px;
    background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
  }
  .label {
    position: absolute;
    pointer-events: none;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 0.6rem;
    mix-blend-mode: difference;
  }
</style>