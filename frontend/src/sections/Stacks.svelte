<script lang="ts">
  import { CaretDown, CaretRight, FaceAdd, FolderAdd } from 'carbon-icons-svelte'
  import { type LoadedFile } from '../types/file'
  import { RemoveStackUndoable, ShrinkStackSliceUndoable, GrowStackSliceUndoable, RemoveAnimationUndoable, AddAnimationUndoable, AddStackUndoable, ChangeFrameTimeUndoable, RenameAnimationUndoable, RenameStackUndoable, DuplicateStackUndoable, DuplicateAnimationUndoable, MoveAnimationUndoable, MoveStackUndoable } from '../types/file/undoables'
  import { ContextMenu, ContextMenuOption, NumberInput } from 'carbon-components-svelte'
  import Button from '../components/common/Button.svelte'
  import { fileStates } from '../stores/file'
  import RenameModal from '../components/RenameModal.svelte'
  import SmallStackPreview from './SmallStackPreview.svelte'
  import { smallPreviewSettings } from '../stores/smallpreview'

  export let file: LoadedFile

  let folded: Record<string, boolean> = {}

  let hoveringStackIndex: number = -1
  let hoveringStackSide: 'above' | 'below' | 'middle' = 'above'
  let hoveringAnimationIndex: number = -1
  let hoveringAnimationSide: 'above' | 'below' | 'middle' = 'above'

  let contextX: number = 0
  let contextY: number = 0
  let contextStackName: string = ''
  let contextAnimationName: string = ''
  let contextStackOpen: boolean = false
  let contextAnimationOpen: boolean = false

  function contextStackDelete() {
    if (file.stacks.length === 1) {
      alert('thou shall not delete the last stack')
      return
    }
    file.push(new RemoveStackUndoable(contextStackName))
  }
  function contextAnimationDelete() {
    if (file?.stack?.animations.length === 1) {
      alert('thou shall not delete the last animation')
      return
    }
    file.push(new RemoveAnimationUndoable(contextStackName, contextAnimationName))
  }

  function onStackContextMenu(e: CustomEvent) {}
  function changeSlices(e: CustomEvent) {
    if (e.detail <= 0) {
      alert('thou shall not have less than 1 slice')
      return
    }
    if (!file.stack) {
      alert('no stack selected')
      return
    }
    if (e.detail < file.stack.sliceCount) {
      // shrink
      file.push(new ShrinkStackSliceUndoable(file.stack.name, file.stack.sliceCount - Number(e.detail)))
    } else if (e.detail > file.stack.sliceCount) {
      // grow
      file.push(new GrowStackSliceUndoable(file.stack.name, Number(e.detail) - file.stack.sliceCount))
    }
  }
  function changeFrameTime(e: CustomEvent) {
    file.push(new ChangeFrameTimeUndoable(file.stackName, file.animationName, Number(e.detail)))
  }
  function addStack() {
    file.push(new AddStackUndoable())
  }
  function addAnimation() {
    if (!file.stack) {
      alert('no stack selected')
      return
    }
    file.push(new AddAnimationUndoable(file.stack.name))
  }

  let showAnimationRenameModal: boolean = false
  let pendingAnimationRename: string = ''
  function contextAnimationRename() {
    showAnimationRenameModal = true
    pendingAnimationRename = contextAnimationName
  }
  function renameAnimation(v: string) {
    file.push(new RenameAnimationUndoable(contextStackName, contextAnimationName, v))
  }
  function isAnimationValid(v: string) {
    const stack = file.stacks.find((s) => s.name === contextStackName)
    return v !== '' && !stack?.animations.some((a) => a.name === v)
  }
  function contextAnimationDuplicate() {
    file.push(new DuplicateAnimationUndoable(contextStackName, contextAnimationName))
    // Okay this is crummy, but we have no other way to acquire the animation name.
    const stack = file.getStack(contextStackName)
    if (!stack) return
    let name = contextAnimationName + ' copy'
    for (let i = 0; i < stack.animations.length; i++) {
      if (stack.animations[i].name.startsWith(name)) {
        const ending = stack.animations[i].name.slice(name.length + 1)
        if (ending === '') break
        const endingIndex = Number(ending)
        if (!isNaN(endingIndex)) {
          name = contextAnimationName + ' copy ' + endingIndex
        }
      }
    }
    file.setAnimation(name)
  }

  let showStackRenameModal: boolean = false
  let pendingStackRename: string = ''
  function contextStackRename() {
    showStackRenameModal = true
    pendingStackRename = contextStackName
  }
  function renameStack(v: string) {
    file.push(new RenameStackUndoable(contextStackName, v))
  }
  function isStackValid(v: string) {
    return v !== '' && !file.stacks.some((s) => s.name === v)
  }
  function contextStackDuplicate() {
    file.push(new DuplicateStackUndoable(contextStackName))
    // This is also crummy.
    let name = contextStackName + ' copy'
    for (let i = 0; i < file.stacks.length; i++) {
      if (file.stacks[i].name.startsWith(name)) {
        const ending = file.stacks[i].name.slice(name.length + 1)
        if (ending === '') break
        const endingIndex = Number(ending)
        if (!isNaN(endingIndex)) {
          name = contextStackName + ' copy ' + endingIndex
        }
      }
    }
    file.setStack(name)
  }

  function handleStackClick(stack: string) {
    file.setStack(stack)
    file.refresh()
    fileStates.refresh()
  }
  function handleStackRightClick(e: MouseEvent, stack: string) {
    contextStackName = stack
    contextX = e.clientX
    contextY = e.clientY
    contextStackOpen = true
  }
  function handleStackDragStart(e: DragEvent, stack: string, stackIndex: number) {
    e.dataTransfer?.setData('staxie/stack', JSON.stringify({ name: stack, index: stackIndex }))
  }
  function handleStackDragEnd(e: DragEvent) {}
  function handleStackDragOver(e: DragEvent, stackIndex: number) {
    if (!e.dataTransfer?.types.includes('staxie/stack')) return
    e.preventDefault()

    hoveringStackIndex = stackIndex
    const hoveredStackElement = e.target as HTMLElement
    const rect = hoveredStackElement.getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    const relativeHeight = rect.height
    const relativePosition = relativeY / relativeHeight

    if (relativePosition < 0.5) {
      hoveringStackSide = 'above'
    } else if (relativePosition >= 0.5) {
      hoveringStackSide = 'below'
      /*} else {
      hoveringStackSide = 'middle'*/
    }
  }
  function handleStackDrop(e: DragEvent, stackIndex: number) {
    e.preventDefault()
    const hoverStackIndex = hoveringStackIndex
    hoveringStackIndex = -1
    if (!file) return
    const data = e.dataTransfer?.getData('staxie/stack')
    if (!data) return
    const { name, index } = JSON.parse(data)

    if (index === stackIndex) {
      // TODO: show error
      return
    }

    file.push(new MoveStackUndoable(index, stackIndex, hoveringStackSide))
  }

  function handleAnimationClick(stack: string, animation: string) {
    file.setStack(stack)
    file.setAnimation(animation)
    file.refresh()
    fileStates.refresh()
  }
  function handleAnimationRightClick(e: MouseEvent, stack: string, animation: string) {
    contextStackName = stack
    contextAnimationName = animation
    contextX = e.clientX
    contextY = e.clientY
    contextAnimationOpen = true
  }
  function handleAnimationDragStart(e: DragEvent, stack: string, animationIndex: string) {
    e.dataTransfer?.setData('staxie/animation', JSON.stringify({ fromStack: stack, fromIndex: animationIndex }))
  }
  function handleAnimationDragEnd(e: DragEvent) {}
  function handleAnimationDragOver(e: DragEvent, animationIndex: number) {
    if (!e.dataTransfer?.types.includes('staxie/animation')) return
    e.preventDefault()

    hoveringAnimationIndex = animationIndex
    const hoveredAnimationElement = e.target as HTMLElement
    const rect = hoveredAnimationElement.getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    const relativeHeight = rect.height
    const relativePosition = relativeY / relativeHeight

    if (relativePosition < 0.5) {
      hoveringAnimationSide = 'above'
    } else if (relativePosition >= 0.5) {
      hoveringAnimationSide = 'below'
      /*} else {
      hoveringAnimationSide = 'middle'*/
    }
  }
  function handleAnimationDrop(e: DragEvent, stack: string, animationIndex: number) {
    const hoverAnimationIndex = hoveringAnimationIndex
    hoveringAnimationIndex = -1
    if (!file || !file.stack) return
    e.preventDefault()
    const data = e.dataTransfer?.getData('staxie/animation')
    if (!data) return
    const { fromStack, fromIndex } = JSON.parse(data)
    if (fromIndex === animationIndex) {
      // TODO: show error
      return
    }
    if (fromStack !== stack) {
      alert('cannot move animations between stacks (if you want this, request)')
      return
    }
    file.push(new MoveAnimationUndoable(fromStack, fromIndex, animationIndex, hoveringAnimationSide))
  }
</script>

<main>
  {#if $smallPreviewSettings.show}
    <SmallStackPreview file={$file} />
  {:else}
    <span></span>
  {/if}
  <menu class="toolbar">
    <Button kind="ghost" size="small" icon={FolderAdd} tooltip="Add Stack" tooltipPosition="bottom" tooltipAlignment="end" disabled={!file} on:click={addStack} />
    <hr />
    <Button kind="ghost" size="small" icon={FaceAdd} tooltip="Add Animation" tooltipPosition="bottom" tooltipAlignment="end" disabled={!file || !file.stack} on:click={addAnimation} />
  </menu>
  <section class="selected">
    <NumberInput label="slices" value={$file?.stack?.sliceCount} on:change={changeSlices} />
    <NumberInput label="frametime (ms)" value={$file?.animation?.frameTime} on:change={changeFrameTime} />
  </section>
  <section>
    {#if file}
      <ul class="stacks">
        {#each $file.stacks as stack, stackIndex}
          {@const stackSelected = $file.stackName === stack.name}
          <li class="stack{hoveringStackIndex === stackIndex ? ' --targeted' + (' --' + hoveringStackSide) : ''}">
            <header class:--selected={stackSelected} on:click={(e) => handleStackClick(stack.name)} on:contextmenu|preventDefault={(e) => handleStackRightClick(e, stack.name)} on:dragstart={(e) => handleStackDragStart(e, stack.name, stackIndex)} on:dragend={handleStackDragEnd} on:dragover={(e) => handleStackDragOver(e, stackIndex)} on:drop={(e) => handleStackDrop(e, stackIndex)} draggable={true}>
              <Button icon={folded[stack.name] ? CaretRight : CaretDown} on:click={() => (folded[stack.name] = !folded[stack.name])} />
              <span>{stack.name}</span>
            </header>
            <ul class="animations">
              {#if !folded[stack.name]}
                {#each stack.animations as animation, animationIndex}
                  <li class="animation{hoveringAnimationIndex === animationIndex ? ' --targeted' + (' --' + hoveringAnimationSide) : ''}" on:click={(e) => handleAnimationClick(stack.name, animation.name)} on:contextmenu|preventDefault={(e) => handleAnimationRightClick(e, stack.name, animation.name)} on:dragstart={(e) => handleAnimationDragStart(e, stack.name, animationIndex)} on:dragend={handleAnimationDragEnd} on:dragover={(e) => handleAnimationDragOver(e, animationIndex)} on:drop={(e) => handleAnimationDrop(e, stack.name, animationIndex)} draggable="true">
                    <header class:--selected={stackSelected && $file.animationName === animation.name}>
                      <span>{animation.name}</span>
                    </header>
                  </li>
                {/each}
              {/if}
            </ul>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
  <ContextMenu bind:open={contextStackOpen} bind:x={contextX} bind:y={contextY} target={[]} on:open={onStackContextMenu}>
    <ContextMenuOption labelText="Rename Stack" on:click={contextStackRename} />
    <ContextMenuOption labelText="Duplicate Stack" on:click={contextStackDuplicate} />
    <ContextMenuOption labelText="Delete Stack" kind="danger" on:click={contextStackDelete} />
  </ContextMenu>
  <ContextMenu bind:open={contextAnimationOpen} bind:x={contextX} bind:y={contextY} target={[]} on:open={onStackContextMenu}>
    <ContextMenuOption labelText="Rename Animation" on:click={contextAnimationRename} />
    <ContextMenuOption labelText="Duplicate Animation" on:click={contextAnimationDuplicate} />
    <ContextMenuOption labelText="Delete Animation" kind="danger" on:click={contextAnimationDelete} />
  </ContextMenu>
  {#if showAnimationRenameModal}
    <RenameModal bind:open={showAnimationRenameModal} bind:text={pendingAnimationRename} heading="Rename Animation" onsubmit={renameAnimation} isvalid={isAnimationValid} />
  {/if}
  {#if showStackRenameModal}
    <RenameModal bind:open={showStackRenameModal} bind:text={pendingStackRename} heading="Rename Stack" onsubmit={renameStack} isvalid={isStackValid} />
  {/if}
</main>

<style>
  main {
    height: 100%;
    display: grid;
    grid-template-rows: auto auto 1fr 4fr;
    grid-template-columns: minmax(0, 1fr);
  }
  .toolbar {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    height: 2em;
  }
  .toolbar hr {
    height: 50%;
    width: 1px;
    border: none;
    background-color: var(--cds-text-02, #c6c6c6);
    margin: 0 0.5rem;
  }
  .stacks {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .stack {
    width: 100%;
  }
  .stack header {
    text-align: left;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    align-items: center;
    background-color: var(--cds-ui-01, #f4f4f4);
    color: var(--cds-text-02, #525252);
    border-left: 0.25rem solid transparent;
    border-top: 1px solid transparent;
    border-bottom: 1px solid var(--cds-ui-01);
  }
  .stack header:hover {
    background-color: var(--cds-ui-02, #e0e0e0);
  }
  .stack > header.--selected {
    border-left: 0.25rem solid var(--cds-interactive-04, #0f62fe);
  }
  .stack.--targeted > header {
    background: var(--cds-highlight);
  }
  .stack.--targeted.--above > header {
    border-top: 1px solid var(--cds-focus);
  }
  .stack.--targeted.--below > header {
    border-bottom: 1px solid var(--cds-focus);
  }
  .stack header span {
    height: 100%;
    display: grid;
    align-items: center;
  }
  .animation {
    text-align: left;
  }
  .animation header {
    padding: 0.25rem;
    padding-left: 3rem;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    align-items: center;
    background-color: var(--cds-ui-01, #f4f4f4);
    color: var(--cds-text-02, #525252);
    border-top: 1px solid transparent;
    border-bottom: 1px solid var(--cds-ui-01);
  }
  .animation header.--selected {
    background-color: var(--cds-ui-02, #e0e0e0);
  }
  .animation.--targeted header {
    background: var(--cds-highlight);
  }
  .animation.--targeted.--above header {
    border-top: 1px solid var(--cds-focus);
  }
  .animation.--targeted.--below header {
    border-bottom: 1px solid var(--cds-focus);
  }
</style>
