<script lang="ts">
  import type { data } from '../wailsjs/go/models.js'
  import Editor2D from './sections/Editor2D.svelte'
  import Importer from './sections/Importer.svelte';
  import PaletteSection from './sections/palette.svelte'
  import { Palette, PaletteEntry, defaultPalette } from './types/palette'

  import type { LoadedFile } from './types/file.ts'

  import "carbon-components-svelte/css/all.css"
  import { Tabs, Tab, TabContent, Theme, Button, Modal, Truncate } from "carbon-components-svelte"
  import { ComposedModal } from "carbon-components-svelte"
  
  import { OverflowMenu, OverflowMenuItem } from "carbon-components-svelte"

  import { Close } from "carbon-icons-svelte"
  
  let theme: 'white'|'g10'|'g80'|'g90'|'g100' = 'g90'
  
  let palette: Palette = defaultPalette()
  let primaryColorIndex: number = 1
  let secondaryColorIndex: number = 0
  
  let showImport: boolean = false
  let importValid: boolean = false
  let importImage: HTMLImageElement = null
  let importFile: data.StackistFile = null
  let importFilepath: string = ''

  let refresh = {}

  let files: LoadedFile[] = []

  function engageImport() {
    if (importValid) {
      files = [...files, {
        filepath: importFilepath,
        title: importFilepath,
        data: importFile,
        image: importImage,
      }]
      console.log(files)
    }
    showImport = false
  }
  function closeFile(index: number) {
    files = files.filter((_,i)=>i!==index)
  }
</script>

<Theme bind:theme/>
<main>
  <menu>
    <OverflowMenu size="sm">
      <div slot="menu">File</div>
      <OverflowMenuItem text="New"/>
      <OverflowMenuItem text="Open..."/>
      <OverflowMenuItem text="Import from PNG..." on:click={() => showImport = true}/>
      <OverflowMenuItem text="Save"/>
      <OverflowMenuItem text="Save As..."/>
      <OverflowMenuItem hasDivider danger text="Quit"/>
    </OverflowMenu>
  </menu>
  <section class='content'>
    <section class='left'>
      <PaletteSection bind:palette bind:primaryColorIndex bind:secondaryColorIndex />
    </section>
    <section class='middle'>
      <Tabs>
        {#each files as file, index}
          <Tab on:click={()=>refresh={}}>
            <span class='tab'>
              <span>{file.title}</span>
              <Button size="small" kind="ghost" iconDescription="close" icon={Close} href="#" on:click={(e)=>{e.preventDefault();closeFile(index)}} />
            </span>
          </Tab>
        {/each}
        <svelte:fragment slot="content">
          {#each files as file}
            <TabContent>
              <Editor2D img={file.image} refresh={refresh} />
            </TabContent>
          {/each}
        </svelte:fragment>
      </Tabs>
    </section>
  </section>
</main>
<ComposedModal bind:open={showImport} size="sm" preventCloseOnClickOutside on:click:button--primary={engageImport}>
  <Importer
    bind:open={showImport}
    bind:valid={importValid}
    bind:file={importFile}
    bind:img={importImage}
    bind:filepath={importFilepath}
  />
</ComposedModal>

<style>
  main {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
  }
  .content {
    display: grid;
    grid-template-columns: 1fr 4fr;
    grid-template-rows: minmax(0, 1fr);
  }
  .left {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
  }
  .middle {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
  }
  .tab {
    display: inline-grid;
    grid-template-columns: 9em minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: absolute;
    top: 0;
    left: 0;
  }
  .tab span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
