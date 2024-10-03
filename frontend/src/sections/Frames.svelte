<script lang="ts">
  import { LoadedFile } from '../types/file'
  import { AddAnimationFrameUndoable, ClearAnimationFrameUndoable, ClearSliceUndoable, DuplicateAnimationFrameUndoable, DuplicateSliceUndoable, RemoveSliceUndoable, RemoveAnimationFrameUndoable, MoveAnimationFrameUndoable, MoveAnimationFrameSliceUndoable } from '../types/file/undoables'
  import { ContextMenu, ContextMenuOption } from 'carbon-components-svelte'
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

  let hoveringSliceIndex: number = -1
  let hoveringSliceSide: 'top' | 'bottom' | 'middle' = 'middle'
  let hoveringFrameIndex: number = -1
  let hoveringFrameSide: 'top' | 'bottom' | 'middle' = 'middle'

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
    file.setFrameIndex(file.frameIndex + 1)
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
  function onSliceClick(e: MouseEvent, sliceIndex: number) {
    if (e.ctrlKey) {
      if (file.isSliceSelected(sliceIndex)) {
        file.deselectSliceIndex(sliceIndex)
      } else {
        file.selectSliceIndex(sliceIndex, false)
      }
      if (file.sliceIndex === -1) {
        file.setSliceIndex(sliceIndex)
      }
    } else {
      file.selectSliceIndex(sliceIndex, true)
      file.setSliceIndex(sliceIndex)
    }
    file.refresh()
    fileStates.refresh()
  }
  function contextSliceClear() {
    if (!file || !file.frame) return
    file.push(new ClearSliceUndoable(file.frame, contextSliceIndex))
  }
  function contextSliceDuplicate() {
    if (!file || !file.stack) return
    file.push(new DuplicateSliceUndoable(file.stack.name, contextSliceIndex))
    file.setSliceIndex(file.sliceIndex + 1)
  }
  function contextSliceDelete() {
    if (!file || !file.stack) return
    file.push(new RemoveSliceUndoable(file.stack.name, contextSliceIndex))
  }

  function handleSliceDragStart(e: DragEvent, sliceIndex: number) {
    e.dataTransfer?.setData('staxie/slice', JSON.stringify({ index: sliceIndex }))
  }
  function handleSliceDragEnd(e: DragEvent) {}
  function handleSliceDragOver(e: DragEvent, sliceIndex: number) {
    if (!e.dataTransfer?.types.includes('staxie/slice')) return
    e.preventDefault()

    hoveringSliceIndex = sliceIndex
    const hoveredSliceElement = e.target as HTMLElement
    const rect = hoveredSliceElement.getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    const relativeHeight = rect.height
    const relativePosition = relativeY / relativeHeight

    if (relativePosition < 0.25) {
      hoveringSliceSide = 'top'
    } else if (relativePosition > 0.75) {
      hoveringSliceSide = 'bottom'
    } else {
      hoveringSliceSide = 'middle'
    }
  }
  function handleSliceDrop(e: DragEvent, sliceIndex: number) {
    hoveringSliceIndex = -1
    if (!file || !file.frame) return
    e.preventDefault()
    const data = e.dataTransfer?.getData('staxie/slice')
    if (!data) return
    const { index } = JSON.parse(data)
    file.push(new MoveAnimationFrameSliceUndoable(file.stackName, file.animationName, file.frameIndex, index, sliceIndex))
    file.selectSliceIndex(index, true)
    file.setSliceIndex(index)
  }
  function handleSliceDragLeave(e: DragEvent) {
    if (!e.dataTransfer?.types.includes('staxie/slice')) return
    e.preventDefault()
    hoveringSliceIndex = -1
  }

  function handleFrameDragStart(e: DragEvent, frameIndex: number) {
    e.dataTransfer?.setData('staxie/frame', JSON.stringify({ index: frameIndex }))
  }
  function handleFrameDragEnd(e: DragEvent) {}
  function handleFrameDragOver(e: DragEvent, frameIndex: number) {
    if (!e.dataTransfer?.types.includes('staxie/frame')) return
    e.preventDefault()
    hoveringFrameIndex = frameIndex
    const hoveredFrameElement = e.target as HTMLElement
    const rect = hoveredFrameElement.getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    const relativeHeight = rect.height
    const relativePosition = relativeY / relativeHeight

    if (relativePosition < 0.25) {
      hoveringFrameSide = 'top'
    } else if (relativePosition > 0.75) {
      hoveringFrameSide = 'bottom'
    } else {
      hoveringFrameSide = 'middle'
    }
  }
  function handleFrameDragLeave(e: DragEvent) {
    if (!e.dataTransfer?.types.includes('staxie/frame')) return
    e.preventDefault()
    hoveringFrameIndex = -1
  }
  function handleFrameDrop(e: DragEvent, frameIndex: number) {
    hoveringFrameIndex = -1
    if (!file || !file.stack) return
    e.preventDefault()
    const data = e.dataTransfer?.getData('staxie/frame')
    if (!data) return
    const { index } = JSON.parse(data)
    file.push(new MoveAnimationFrameUndoable(file.stackName, file.animationName, index, frameIndex))
    file.selectFrameIndex(index, true)
    file.setFrameIndex(index)
  }
</script>

<main>
  <section class="slicesContainer">
    <span class="buttons"> </span>
    <!--<Button
      kind="ghost"
      size="small"
      icon={NewTab}
      iconDescription="Add Slice"
      tooltipPosition="top"
      tooltipAlignment="end"
      disabled={!file || !file.frame}
    />-->
    <section class="slices">
      {#if $file.frame}
        {#each $file.frame.slices as slice, realSliceIndex}
          {@const sliceIndex = $file.stack?.sliceCount - realSliceIndex - 1}
          <article class="slice{sliceIndex === $file.sliceIndex ? ' --focused' : ''}{$file.isSliceSelected(sliceIndex) ? ' --selected' : ''}{hoveringSliceIndex === sliceIndex ? ' --targeted' + (' --' + hoveringSliceSide) : ''}" on:click={(e) => onSliceClick(e, sliceIndex)} on:contextmenu|preventDefault={(e) => onSliceRightClick(e, sliceIndex)} on:dragstart={(e) => handleSliceDragStart(e, sliceIndex)} on:dragend={handleSliceDragEnd} on:dragover={(e) => handleSliceDragOver(e, sliceIndex)} on:dragleave={handleSliceDragLeave} on:drop={(e) => handleSliceDrop(e, sliceIndex)} draggable="true">
            <span class="sliceIndex">{sliceIndex + 1}</span>
          </article>
        {/each}
      {/if}
    </section>
  </section>
  <section class="framesContainer">
    <span class="buttons">
      <Button kind="ghost" size="small" icon={AddAlt} tooltip="Add Frame" tooltipPosition="top" tooltipAlignment="end" disabled={!file || !file.animation} on:click={addFrame} />
    </span>
    <section class="frames">
      {#if $file.animation}
        {#each $file.animation.frames as frame, frameIndex}
          <article class="frame{frameIndex === $file.frameIndex ? ' --focused' : ''}{$file.isFrameSelected(frameIndex) ? ' --selected' : ''}{hoveringFrameIndex === frameIndex ? ' --targeted' + (' --' + hoveringFrameSide) : ''}" on:click={(e) => onFrameClick(e, frameIndex)} on:contextmenu|preventDefault={(e) => onFrameRightClick(e, frameIndex)} on:dragstart={(e) => handleFrameDragStart(e, frameIndex)} on:dragend={handleFrameDragEnd} on:dragover={(e) => handleFrameDragOver(e, frameIndex)} on:dragleave={handleFrameDragLeave} on:drop={(e) => handleFrameDrop(e, frameIndex)} draggable="true">
            <span class="frameIndex">{frameIndex + 1}</span>
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
    <ContextMenuOption labelText="Delete Slice" kind="danger" on:click={contextSliceDelete} />
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
    grid-template-rows: /*auto*/ auto minmax(0, 1fr);
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
    border-top: 1px solid transparent;
    border-bottom: 1px solid var(--cds-ui-01);
    background: var(--cds-ui-02);
  }
  .slice.--selected {
    background: var(--cds-active-primary);
  }
  .slice.--focused {
    background: var(--cds-inverse-focus-ui);
  }
  .slice.--targeted {
    background: var(--cds-highlight);
  }
  .slice.--targeted.--top {
    border-top: 1px solid var(--cds-focus);
  }
  .slice.--targeted.--bottom {
    border-bottom: 1px solid var(--cds-focus);
  }
  .slice:hover {
    background: var(--cds-hover-primary);
    cursor: pointer;
  }
  .framesContainer {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto minmax(0, 1fr);
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
    border-top: 1px solid transparent;
    border-bottom: 1px solid var(--cds-ui-01);
    background: var(--cds-ui-02);
  }
  .frame.--selected {
    background: var(--cds-active-primary);
  }
  .frame.--focused {
    background: var(--cds-inverse-focus-ui);
  }
  .frame.--targeted {
    background: var(--cds-highlight);
  }
  .frame.--targeted.--top {
    border-top: 1px solid var(--cds-focus);
  }
  .frame.--targeted.--bottom {
    border-bottom: 1px solid var(--cds-focus);
  }
  .frame:hover {
    background: var(--cds-hover-primary);
    cursor: pointer;
  }
  .buttons {
    min-height: 2rem;
  }
</style>
