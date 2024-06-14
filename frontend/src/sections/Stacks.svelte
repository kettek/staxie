<script lang='ts'>
  import { FaceAdd, FolderAdd } from "carbon-icons-svelte";
  import { type LoadedFile } from "../types/file"
  import { RemoveStackUndoable, ShrinkStackSliceUndoable, GrowStackSliceUndoable, RemoveAnimationUndoable, AddAnimationUndoable, AddStackUndoable, ChangeFrameTimeUndoable } from "../types/file/undoables"
  import { Button, ContextMenu, ContextMenuOption, TreeView, NumberInput } from "carbon-components-svelte"
  import { fileStates } from "../stores/file"

  export let file: LoadedFile
  
  let activeId: string | number = 0
  let selectedIds: (string|number)[] = []
  let children: ({id: string, text: string, children: ({id: string, text: string})[]})[] = []
  $: {
    if ($file) {
      children = $file.stacks.map(stack => {
        return {
          id: stack.name,
          text: stack.name,
          children: stack.animations.map(animation => {
            return {
              id: stack.name+'__'+animation.name,
              text: animation.name
            }
          })
        }
      })
    }
  }
  
  function handleSelect(e) {
    if (!e.detail.leaf) { // Stack
      file.setStack(e.detail.id)
    } else { // Animation
      const stack = e.detail.id.substring(0, e.detail.id.indexOf('__'))
      const animation = e.detail.id.substring(e.detail.id.indexOf('__')+2)
      file.setStack(stack)
      file.setAnimation(animation)
    }
    fileStates.refresh()
  }
  
  let contextX: number = 0
  let contextY: number = 0
  let contextStackOpen: boolean = false
  let contextAnimationOpen: boolean = false
  let contextNode: any = null
  function onStackRightClick(e: MouseEvent, node: any) {
    contextX = e.clientX
    contextY = e.clientY
    contextNode = node
    if (node.leaf) { // animation
      contextAnimationOpen = true
      return
    }
    contextStackOpen = true
  }
  function contextStackDelete() {
    if (file.stacks.length === 1) {
      alert('thou shall not delete the last stack')
      return
    }
    file.push(new RemoveStackUndoable(contextNode.id))
  }
  function contextAnimationDelete() {
    const stackName = contextNode.id.substring(0, contextNode.id.indexOf('__'))
    const animationName = contextNode.id.substring(contextNode.id.indexOf('__')+2)
    if (file?.stack?.animations.length === 1) {
      alert('thou shall not delete the last animation')
      return
    }
    file.push(new RemoveAnimationUndoable(stackName, animationName))
  }
  
  function onStackContextMenu(e: CustomEvent) {
  }
  function changeSlices(e: CustomEvent) {
    if (e.detail <= 0) {
      alert('thou shall not have less than 1 slice')
      return
    }
    if (e.detail < file.stack.sliceCount) { // shrink
      file.push(new ShrinkStackSliceUndoable(file.stack.name, file.stack.sliceCount-Number(e.detail)))
    } else if (e.detail > file.stack.sliceCount) { // grow
      file.push(new GrowStackSliceUndoable(file.stack.name, Number(e.detail)-file.stack.sliceCount))
    }
  }
  function changeFrameTime(e: CustomEvent) {
    file.push(new ChangeFrameTimeUndoable(file.stackName, file.animationName, Number(e.detail)))
  }
  function addStack() {
    file.push(new AddStackUndoable())
  }
  function addAnimation() {
    file.push(new AddAnimationUndoable(file.stack.name))
  }
</script>

<main>
  <menu class='toolbar'>
    <Button
      kind="ghost"
      size="small"
      icon={FolderAdd}
      iconDescription="Add Stack"
      tooltipPosition="bottom"
      tooltipAlignment="end"
      disabled={!file}
      on:click={addStack}
    />
    <hr />
    <Button
      kind="ghost"
      size="small"
      icon={FaceAdd}
      iconDescription="Add Animation"
      tooltipPosition="bottom"
      tooltipAlignment="end"
      disabled={!file || !file.stack}
      on:click={addAnimation}
    />
  </menu>
  <section class='selected'>
    <NumberInput label='slices' value={$file?.stack?.sliceCount} on:change={changeSlices}/>
    <NumberInput label='frametime (ms)' value={$file?.animation?.frameTime} on:change={changeFrameTime}/>
  </section>
  <section class='stacks'>
    {#if file}
      <TreeView
        size="compact"
        {children}
        bind:activeId
        bind:selectedIds
        on:select={handleSelect}
        let:node
      >
        <span on:contextmenu|preventDefault={(e)=>onStackRightClick(e, node)}>{node.text}</span>
      </TreeView>
    {/if}
  </section>
  <ContextMenu bind:open={contextStackOpen} bind:x={contextX} bind:y={contextY} target={[]} on:open={onStackContextMenu}>
    <ContextMenuOption labelText="Delete Stack" kind="danger" on:click={contextStackDelete} />
  </ContextMenu>
  <ContextMenu bind:open={contextAnimationOpen} bind:x={contextX} bind:y={contextY} target={[]} on:open={onStackContextMenu}>
    <ContextMenuOption labelText="Delete Animation" kind="danger" on:click={contextAnimationDelete} />
  </ContextMenu>
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
  }
  .slices {
    display: flex;
    flex-wrap: wrap;
  }
  .slice {
    padding: 0.25rem;
    width: 2rem;
    height: 2rem;
    border: 1px solid gray;
  }
</style>