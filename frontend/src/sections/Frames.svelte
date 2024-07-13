<script lang='ts'>
  import { LoadedFile } from "../types/file"
  import { AddAnimationFrameUndoable, ClearAnimationFrameUndoable, ClearSliceUndoable, DuplicateAnimationFrameUndoable, DuplicateSliceUndoable, RemoveSliceUndoable, RemoveAnimationFrameUndoable } from "../types/file/undoables"
  import { ContextMenu, ContextMenuOption } from 'carbon-components-svelte';
  import Button from '../components/common/Button.svelte'
  import { fileStates } from '../stores/file'
  import { AddAlt } from 'carbon-icons-svelte'

  export let file: LoadedFile
  function onSliceRightClick(e: MouseEvent, sliceIndex: number) {
    contextSliceOpen = true
    contextX = e.clientX
    contextY = e.clientY
    contextSliceIndex = sliceIndex
  }
  function setSlice(sliceIndex: number) {
    file.setSliceIndex(sliceIndex)
    file.refresh()
    fileStates.refresh()
  }

  function addFrame() {
    file.push(new AddAnimationFrameUndoable(file.stack.name, file.animation.name))
  }
  
  let contextFrameOpen: boolean = false
  let contextFrameIndex: number = -1
  let contextSliceOpen: boolean = false
  let contextSliceIndex: number = -1
  let contextX: number = 0
  let contextY: number = 0
  function onFrameRightClick(e: MouseEvent, frameIndex: number) {
    contextFrameOpen = true
    contextX = e.clientX
    contextY = e.clientY
    contextFrameIndex = frameIndex
  }
  function onFrameClick(e: MouseEvent, frameIndex: number) {
    if (e.ctrlKey) {
      if (file.isFrameSelected(frameIndex)) {
        file.deselectFrameIndex(frameIndex)
      } else {
        file.selectFrameIndex(frameIndex, false)
      }
      if (file.frameIndex === -1) {
        file.setFrameIndex(frameIndex)
      }
    } else {
      file.selectFrameIndex(frameIndex, true)
      file.setFrameIndex(frameIndex)
    }
    file.refresh()
    fileStates.refresh()
  }
  function contextFrameDuplicate() {
    if (!file || !file.stack || !file.animation) return
    file.push(new DuplicateAnimationFrameUndoable(file.stack.name, file.animation.name, contextFrameIndex))
  }
  function contextFrameDelete() {
    if (!file || !file.stack || !file.animation) return
    if (file.animation?.frames.length === 1) {
      alert('thou shalt not delete the last frame')
      return
    }
    file.push(new RemoveAnimationFrameUndoable(file.stack.name, file.animation.name, contextFrameIndex))
  }
  function contextFrameClear() {
    if (!file || !file.stack || !file.animation) return
    file.push(new ClearAnimationFrameUndoable(file.stack.name, file.animation.name, contextFrameIndex))
  }
  function contextSliceClear() {
    if (!file || !file.frame) return
    file.push(new ClearSliceUndoable(file.frame, contextSliceIndex))
  }
  function contextSliceDuplicate() {
    if (!file || !file.stack) return
    file.push(new DuplicateSliceUndoable(file.stack.name, contextSliceIndex))
  }
  function contextSliceDelete() {
    if (!file || !file.stack) return
    file.push(new RemoveSliceUndoable(file.stack.name, contextSliceIndex))
  }
</script>

<main>
  <section class='slicesContainer'>
    <!--<Button
      kind="ghost"
      size="small"
      icon={NewTab}
      iconDescription="Add Slice"
      tooltipPosition="top"
      tooltipAlignment="end"
      disabled={!file || !file.frame}
    />-->
    <section class='slices'>
      {#if $file.frame}
        {#each $file.frame.slices as slice, sliceIndex}
          <article class='slice{sliceIndex===$file.sliceIndex?' --focused':''}' on:click={()=>setSlice(sliceIndex)} on:contextmenu|preventDefault={(e)=>onSliceRightClick(e, sliceIndex)}>
            <span class='sliceIndex'>{sliceIndex+1}</span>
          </article>
        {/each}
      {/if}
    </section>
  </section>
  <section class='framesContainer'>
    <Button
      kind="ghost"
      size="small"
      icon={AddAlt}
      tooltip="Add Frame"
      tooltipPosition="top"
      tooltipAlignment="end"
      disabled={!file || !file.animation}
      on:click={addFrame}
    />
    <section class='frames'>
      {#if $file.animation}
        {#each $file.animation.frames as frame, frameIndex}
          <article class='frame{frameIndex===$file.frameIndex?' --focused':''}{$file.isFrameSelected(frameIndex)?' --selected':''}' on:click={(e)=>onFrameClick(e, frameIndex)} on:contextmenu|preventDefault={(e)=>onFrameRightClick(e, frameIndex)}>
            <span class='frameIndex'>{frameIndex+1}</span>
          </article>
        {/each}
      {/if}
    </section>
  </section>
  <ContextMenu bind:open={contextFrameOpen} bind:x={contextX} bind:y={contextY} target={[]}>
    <ContextMenuOption labelText="Duplicate Frame" on:click={contextFrameDuplicate} />
    <ContextMenuOption labelText="Clear Frame" on:click={contextFrameClear} />
    <ContextMenuOption labelText="Delete Frame" kind="danger" on:click={contextFrameDelete} />
  </ContextMenu>
  <ContextMenu bind:open={contextSliceOpen} bind:x={contextX} bind:y={contextY} target={[]}>
    <ContextMenuOption labelText="Clear Slice" on:click={contextSliceClear} />
    <ContextMenuOption labelText="Duplicate Slice" on:click={contextSliceDuplicate} />
    <ContextMenuOption labelText='Delete Slice' kind='danger' on:click={contextSliceDelete} />
  </ContextMenu>
</main>

<style>
  main {
    display: grid;
    grid-template-columns: auto auto;
    grid-template-rows: minmax(0, 1fr);
    user-select: none;
    padding-top: calc(2rem + 1.4rem); /* NOTE: This is to offset the toolbar + tabbar in the main app view, as it looks better aligned to the canvas */
  }
  .slicesContainer {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: /*auto*/ minmax(0, 1fr);
    min-width: 2em;
  }
  .slices {
    font-family: monospace;
    font-size: 0.75rem;
    overflow-y: scroll;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
  }
  .slices::-webkit-scrollbar {
    width: 0.2rem !important;
  }
  .slices::-webkit-scrollbar-track {
    background: var(--cds-ui-01) !important;
  }
  .slices::-webkit-scrollbar-thumb {
    background: var(--cds-text-03) !important;
  }
  .slices::-webkit-scrollbar-thumb:hover {
    background: var(--cds-hover-primary) !important;
  }
  .slices::-webkit-scrollbar-thumb:active {
    background: var(--cds-active-primary) !important;
  }
  .slice {
    text-align: center;
    padding: 0.2rem;
    border-bottom: 1px solid var(--cds-ui-01);
    background: var(--cds-ui-02);
  }
  .slice.--selected {
    background: var(--cds-active-primary);
  }
  .slice.--focused {
    background: var(--cds-inverse-focus-ui);
  }
  .slice:hover {
    background: var(--cds-hover-primary);
    cursor: pointer;
  }
  .framesContainer {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    min-width: 2em;
  }
  .frames {
    font-family: monospace;
    font-size: 0.75rem;
    overflow-x: hidden;
    overflow-y: scroll;
    display: flex;
    flex-direction: column;
    min-width: 1.5em;
  }
  .frames::-webkit-scrollbar {
    width: 0.2rem !important;
  }
  .frames::-webkit-scrollbar-track {
    background: var(--cds-ui-01) !important;
  }
  .frames::-webkit-scrollbar-thumb {
    background: var(--cds-text-03) !important;
  }
  .frames::-webkit-scrollbar-thumb:hover {
    background: var(--cds-hover-primary) !important;
  }
  .frames::-webkit-scrollbar-thumb:active {
    background: var(--cds-active-primary) !important;
  }
  .frame {
    text-align: center;
    padding: 0.2rem;
    border-bottom: 1px solid var(--cds-ui-01);
    background: var(--cds-ui-02);
  }
  .frame.--selected {
    background: var(--cds-active-primary);
  }
  .frame.--focused {
    background: var(--cds-inverse-focus-ui);
  }
  .frame:hover {
    background: var(--cds-hover-primary);
    cursor: pointer;
  }
</style>