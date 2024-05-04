<script lang='ts'>
  import { FaceAdd, FolderAdd, GroupObjectsNew } from "carbon-icons-svelte";
  import type { LoadedFile } from "../types/file"
  import { Button } from "carbon-components-svelte"

  export let file: LoadedFile
  $: console.log(file)
  
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
      {#each Object.entries(file.data.groups) as [groupName, group]}
        <article class='group'>
          <span class='groupName'>{groupName}</span>
          <section class='animations'>
            {#each Object.entries(group.animations) as [animationName, animation]}
              <article class='animation'>
                <span class='animationName'>{animationName}</span>
              </article>
            {/each}
          </section>
        </article>
      {/each}
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