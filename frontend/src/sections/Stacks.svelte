<script lang="ts">
  import { CaretDown, CaretRight, FaceAdd, FolderAdd } from 'carbon-icons-svelte'
  import { type LoadedFile } from '../types/file'
  import { RemoveStackUndoable, ShrinkStackSliceUndoable, GrowStackSliceUndoable, RemoveAnimationUndoable, AddAnimationUndoable, AddStackUndoable, ChangeFrameTimeUndoable, RenameAnimationUndoable, RenameStackUndoable, DuplicateStackUndoable, DuplicateAnimationUndoable } from '../types/file/undoables'
  import { ContextMenu, ContextMenuOption, NumberInput } from 'carbon-components-svelte'
  import Button from '../components/common/Button.svelte'
  import { fileStates } from '../stores/file'
  import RenameModal from '../components/RenameModal.svelte'

  export let file: LoadedFile

  let folded: Record<string, boolean> = {}

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
  function contextAnimationDuplicate() {
    file.push(new DuplicateAnimationUndoable(contextStackName, contextAnimationName))
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
  function contextStackDuplicate() {
    file.push(new DuplicateStackUndoable(contextStackName))
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
</script>

<main>
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
      <ul class='stacks'>
        {#each $file.stacks as stack, stackIndex}
          {@const stackSelected = $file.stackName===stack.name}
          <li class='stack'>
            <header class:--selected={stackSelected} on:click={(e)=>handleStackClick(stack.name)} on:contextmenu|preventDefault={(e)=>handleStackRightClick(e, stack.name)}>
              <Button icon={folded[stack.name]?CaretRight:CaretDown} on:click={() => folded[stack.name] = !folded[stack.name]} />
              <span>{stack.name}</span>
            </header>
            <ul class='animations'>
              {#if !folded[stack.name]}
                {#each stack.animations as animation, animationIndex}
                  <li class='animation' on:click={(e)=>handleAnimationClick(stack.name, animation.name)} on:contextmenu|preventDefault={(e) => handleAnimationRightClick(e, stack.name, animation.name)}>
                    <header class:--selected={stackSelected&&$file.animationName===animation.name}>
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
    <RenameModal bind:open={showAnimationRenameModal} bind:text={pendingAnimationRename} heading="Rename Animation" onsubmit={renameAnimation} />
  {/if}
  {#if showStackRenameModal}
    <RenameModal bind:open={showStackRenameModal} bind:text={pendingStackRename} heading="Rename Stack" onsubmit={renameStack} />
  {/if}
</main>

<style>
  main {
    height: 100%;
    display: grid;
    grid-template-rows: auto 1fr 4fr;
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
  }
  .stack header:hover {
    background-color: var(--cds-ui-02, #e0e0e0);
  }
  .stack > header.--selected {
    border-left: 0.25rem solid var(--cds-interactive-04, #0f62fe);
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
  }
  .animation header.--selected {
    background-color: var(--cds-ui-02, #e0e0e0);
  }
</style>
