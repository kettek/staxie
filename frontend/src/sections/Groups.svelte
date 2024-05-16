<script lang='ts'>
  import { FaceAdd, FolderAdd, GroupObjectsNew } from "carbon-icons-svelte";
  import { type LoadedFile, RemoveGroupUndoable, ShrinkGroupSliceUndoable, GrowGroupSliceUndoable, RemoveAnimationUndoable, AddAnimationUndoable } from "../types/file"
  import { Button, ContextMenu, ContextMenuOption, TreeView, NumberInput } from "carbon-components-svelte"
  import { fileStates } from "../stores/file"

  export let file: LoadedFile
  
  let activeId: string | number = 0
  let selectedIds: (string|number)[] = []
  let children = []
  $: {
    if ($file) {
      children = $file.groups.map(group => {
        return {
          id: group.name,
          text: group.name,
          children: group.animations.map(animation => {
            return {
              id: group.name+'__'+animation.name,
              text: animation.name
            }
          })
        }
      })
    }
  }
  
  function handleSelect(e) {
    if (!e.detail.leaf) { // Group
      file.setGroup(e.detail.id)
    } else { // Animation
      const group = e.detail.id.substring(0, e.detail.id.indexOf('__'))
      const animation = e.detail.id.substring(e.detail.id.indexOf('__')+2)
      file.setGroup(group)
      file.setAnimation(animation)
    }
    fileStates.refresh()
  }
  
  let contextX: number = 0
  let contextY: number = 0
  let contextGroupOpen: boolean = false
  let contextAnimationOpen: boolean = false
  let contextNode: any = null
  function onGroupRightClick(e: MouseEvent, node: any) {
    contextX = e.clientX
    contextY = e.clientY
    contextNode = node
    if (node.leaf) { // animation
      contextAnimationOpen = true
      return
    }
    contextGroupOpen = true
  }
  function contextGroupDelete() {
    file.push(new RemoveGroupUndoable(contextNode.id))
  }
  function contextAnimationDelete() {
    const groupName = contextNode.id.substring(0, contextNode.id.indexOf('__'))
    const animationName = contextNode.id.substring(contextNode.id.indexOf('__')+2)
    file.push(new RemoveAnimationUndoable(groupName, animationName))
  }
  
  function onGroupContextMenu(e: CustomEvent) {
  }
  function changeSlices(e: CustomEvent) {
    if (e.detail < file.group.sliceCount) { // shrink
      file.push(new ShrinkGroupSliceUndoable(file.group.name, file.group.sliceCount-Number(e.detail)))
    } else if (e.detail > file.group.sliceCount) { // grow
      file.push(new GrowGroupSliceUndoable(file.group.name, Number(e.detail)-file.group.sliceCount))
    }
  }
  function addAnimation() {
    file.push(new AddAnimationUndoable(file.group.name))
  }
</script>

<main>
  <menu class='toolbar'>
    <Button
      kind="ghost"
      size="small"
      icon={FolderAdd}
      iconDescription="Add Group"
      tooltipPosition="bottom"
      tooltipAlignment="end"
      disabled={!file}
    />
    <hr />
    <Button
      kind="ghost"
      size="small"
      icon={FaceAdd}
      iconDescription="Add Animation"
      tooltipPosition="bottom"
      tooltipAlignment="end"
      disabled={!file || !file.group}
      on:click={addAnimation}
    />
  </menu>
  <section class='selected'>
    <NumberInput label='slices' value={$file?.group?.sliceCount} on:change={changeSlices}/>
  </section>
  <section class='groups'>
    {#if file}
      <TreeView
        size="compact"
        {children}
        bind:activeId
        bind:selectedIds
        on:select={handleSelect}
        let:node
      >
        <span on:contextmenu|preventDefault={(e)=>onGroupRightClick(e, node)}>{node.text}</span>
      </TreeView>
    {/if}
  </section>
  <ContextMenu bind:open={contextGroupOpen} bind:x={contextX} bind:y={contextY} target={[]} on:open={onGroupContextMenu}>
    <ContextMenuOption labelText="Delete Group" kind="danger" on:click={contextGroupDelete} />
  </ContextMenu>
  <ContextMenu bind:open={contextAnimationOpen} bind:x={contextX} bind:y={contextY} target={[]} on:open={onGroupContextMenu}>
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
  .groups {
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