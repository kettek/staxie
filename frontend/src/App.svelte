<script lang="ts">
  import type { data } from '../wailsjs/go/models.js'
  import Editor2D from './sections/Editor2D.svelte'
  import Importer from './sections/Importer.svelte';
  import PaletteSection from './sections/Palette.svelte'
  import FloatingPanel from './components/FloatingPanel.svelte'
  import { Palette, PaletteEntry, defaultPalette } from './types/palette'

  import { LoadedFile } from './types/file'

  import "carbon-components-svelte/css/all.css"
  import { Tabs, Tab, TabContent, Theme, Button, Modal, Truncate, ButtonSet } from "carbon-components-svelte"
  import { ComposedModal } from "carbon-components-svelte"
  
  import { OverflowMenu, OverflowMenuItem } from "carbon-components-svelte"

  import { Close, Erase, PaintBrushAlt, RainDrop, Redo, Select_01, Undo } from "carbon-icons-svelte"
  import StackPreview from './sections/StackPreview.svelte'
  import type { Canvas } from './types/canvas'
  import { BrushTool, EraserTool, FillTool, type Tool } from './types/tools';
  
  let theme: 'white'|'g10'|'g80'|'g90'|'g100' = 'g90'
  
  let palette: Palette = defaultPalette()
  let primaryColorIndex: number = 1
  let secondaryColorIndex: number = 0
  
  let showImport: boolean = false
  let importValid: boolean = false
  let importFile: data.StackistFileV1 = null
  let importFilepath: string = ''
  let importCanvas: Canvas = null
  
  let showPreview: boolean = false
  
  // let toolSelect = new SelectTool()
  let toolFill = new FillTool()
  let toolErase = new EraserTool()
  let toolBrush = new BrushTool()
  let currentTool: Tool = toolBrush
  
  function swapTool(tool: Tool) {
    currentTool = tool
  }

  let refresh = {}

  let files: LoadedFile[] = []
  let focusedFileIndex: number = -1
  let focusedFile: LoadedFile = null
  $: focusedFile = files[focusedFileIndex] ?? null
  $: console.log(focusedFile)
  
  function selectFile(file: LoadedFile, index: number) {
    focusedFileIndex = index
    refresh = {}
  }

  function engageImport() {
    if (importValid) {
      files = [...files, new LoadedFile({filepath: importFilepath, title: importFilepath, canvas: importCanvas, data: importFile})]
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
  <menu class="mainMenu">
    <OverflowMenu size="sm">
      <div slot="menu">File</div>
      <OverflowMenuItem text="New"/>
      <OverflowMenuItem text="Open..."/>
      <OverflowMenuItem text="Import from PNG..." on:click={() => showImport = true}/>
      <OverflowMenuItem text="Save"/>
      <OverflowMenuItem text="Save As..."/>
      <OverflowMenuItem hasDivider danger text="Quit"/>
    </OverflowMenu>
    <OverflowMenu size="sm">
      <div slot="menu">Edit</div>
      <OverflowMenuItem on:click={() => focusedFile?.undo()} disabled={!focusedFile?.canUndo()}>
        Undo &nbsp; <Undo/>
      </OverflowMenuItem>
      <OverflowMenuItem on:click={() => focusedFile?.redo()} disabled={!focusedFile?.canRedo()}>
        Redo &nbsp; <Redo/>
      </OverflowMenuItem>
    </OverflowMenu>
    <OverflowMenu size="sm">
      <div slot="menu">Windows</div>
      <OverflowMenuItem text="Preview" on:click={() => showPreview = true}/>
    </OverflowMenu>
  </menu>
  <section class='content'>
    <section class='left'>
      <PaletteSection bind:palette bind:primaryColorIndex bind:secondaryColorIndex file={focusedFile} />
    </section>
    <menu class='toolbar'>
      <Button disabled kind="ghost" size="small" icon={Select_01} iconDescription="selection" tooltipPosition="right"></Button>
      <Button isSelected={currentTool === toolFill} kind="ghost" size="small" icon={RainDrop} iconDescription="fill" tooltipPosition="right" on:click={()=>swapTool(toolFill)}></Button>
      <Button isSelected={currentTool === toolBrush} kind="ghost" size="small" icon={PaintBrushAlt} iconDescription="paint" tooltipPosition="right" on:click={()=>swapTool(toolBrush)}></Button>
      <Button isSelected={currentTool === toolErase} kind="ghost" size="small" icon={Erase} iconDescription="erase" tooltipPosition="right" on:click={()=>swapTool(toolErase)}></Button>
    </menu>
    <section class='middle'>
      <Tabs>
        {#each files as file, index}
          <Tab on:click={()=>selectFile(file, index)}>
            <span class='tab'>
              <span>{file.title}</span>
              <Button size="small" kind="ghost" iconDescription="close" icon={Close} href="#" on:click={(e)=>{e.preventDefault();closeFile(index)}} />
            </span>
          </Tab>
        {/each}
        <svelte:fragment slot="content">
          {#each files as file}
            <TabContent>
              <Editor2D bind:file={file} refresh={refresh} primaryColorIndex={primaryColorIndex} secondaryColorIndex={secondaryColorIndex} bind:currentTool={currentTool} />
            </TabContent>
          {/each}
        </svelte:fragment>
      </Tabs>
    </section>
    {#if showPreview}
      <FloatingPanel
        label="Stack Preview"
        noPadding
        bind:open={showPreview}
        >
        <StackPreview files={files} />
      </FloatingPanel>
    {/if}
  </section>
</main>
<ComposedModal bind:open={showImport} size="sm" preventCloseOnClickOutside on:click:button--primary={engageImport}>
  <Importer
    bind:open={showImport}
    bind:valid={importValid}
    bind:file={importFile}
    bind:filepath={importFilepath}
    bind:canvas={importCanvas}
  />
</ComposedModal>

<style>
  main {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
  }
  .mainMenu {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
  }
  :global(.mainMenu > button) {
    width: 4rem !important;
    color: var(--cds-text-02, #c6c6c6);
  }
  .content {
    display: grid;
    grid-template-columns: 1fr auto 4fr;
    grid-template-rows: minmax(0, 1fr);
  }
  .left {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
  }
  .toolbar {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
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
