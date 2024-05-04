<script lang='ts'>
  import { FaceAdd, FolderAdd, GroupObjectsNew } from "carbon-icons-svelte";
  import type { LoadedFile } from "../types/file"
  import { Button, TreeView } from "carbon-components-svelte"
  import { fileStates } from "../stores/file"

  export let file: LoadedFile
  
  let activeId: string | number = 0
  let selectedIds: (string|number)[] = []
  let children = []
  $: {
    if (file) {
      children = Object.entries(file.data.groups).map(([groupName, group]) => {
        return {
          id: groupName,
          text: groupName,
          children: Object.entries(group.animations).map(([animationName, animation]) => {
            return {
              id: groupName+'__'+animationName,
              text: animationName
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
      const name = e.detail.id.substring(e.detail.id.indexOf('__')+2)
      file.setAnimation(name)
    }
    fileStates.refresh()
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
    />
    <hr />
    <Button
      kind="ghost"
      size="small"
      icon={FaceAdd}
      iconDescription="Add Animation"
      tooltipPosition="bottom"
      tooltipAlignment="end"
    />
  </menu>
  <section class='groups'>
    {#if file}
      <TreeView
        size="compact"
        {children}
        bind:activeId
        bind:selectedIds
        on:select={handleSelect}
      />
    {/if}
  </section>
</main>

<style>
  main {
    height: 100%;
    display: grid;
    grid-template-rows: auto 1fr;
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
  .layers {
    display: flex;
    flex-wrap: wrap;
  }
  .layer {
    padding: 0.25rem;
    width: 2rem;
    height: 2rem;
    border: 1px solid gray;
  }
</style>