<script lang="ts">
  import { GetFilePath, OpenFileBytes, SaveFilePath, ToggleFullscreen } from '../wailsjs/go/main/App.js'
  import { EventsEmit } from '../wailsjs/runtime/runtime.js'
  import Editor2D from './sections/Editor2D.svelte'
  import Open from './sections/Open.svelte'
  import Import from './sections/Import.svelte'
  import Exporter from './sections/Exporter.svelte'
  import PaletteSection from './sections/Palette.svelte'
  import FloatingPanel from './components/FloatingPanel.svelte'
  import { Palette, defaultPalette } from './types/palette'
  
  import { brushSettings } from './stores/brush'
  import { editor2DSettings } from './stores/editor2d.js'

  import { LoadedFile, PixelsPlaceUndoable, SelectionClearUndoable, SelectionSetUndoable } from './types/file'

  import "carbon-components-svelte/css/all.css"
  import { Tabs, Tab, TabContent, Theme, Button, Modal, Truncate, ButtonSet, NumberInput, Dropdown, Checkbox, TextInput, RadioButton, RadioButtonGroup } from "carbon-components-svelte"
  import { ComposedModal } from "carbon-components-svelte"
  
  import { OverflowMenu, OverflowMenuItem } from "carbon-components-svelte"

  import { Close, Erase, PaintBrushAlt, RainDrop, Redo, Select_01, Undo, Scale, Eyedropper, Move, MagicWand, SprayPaint, Maximize, Minimize } from "carbon-icons-svelte"
  import StackPreview from './sections/StackPreview.svelte'
  import { Canvas } from './types/canvas'
  import { BrushTool, EraserTool, FillTool, PickerTool, SelectionTool, MagicWandTool, type BrushType, type Tool, MoveTool, SprayTool } from './types/tools'
  import BrushSize from './components/BrushSize.svelte'
  import Shortcut from './components/Shortcut.svelte'
  import Shortcuts from './components/Shortcuts.svelte'
  import { CopyPaste } from './types/copypaste'
  import type { PixelPosition } from './types/shapes.js';
  import ColorSelector from './components/ColorSelector.svelte';
  import ColorIndex from './components/ColorIndex.svelte';
  import CheckerboardSettingsModal from './components/CheckerboardSettingsModal.svelte';
  import GridSettingsModal from './components/GridSettingsModal.svelte';
  import ThemeSettingsModal from './components/ThemeSettingsModal.svelte';
  import BackgroundSettingsModal from './components/BackgroundSettingsModal.svelte';
  import New from './sections/New.svelte';
  import PreviewSettingsModal from './components/PreviewSettingsModal.svelte';
  import { SaveFileBytes } from '../wailsjs/go/main/App.js'
  import { onMount } from 'svelte'
  import About from './sections/About.svelte'
  import Groups from './sections/Groups.svelte'
  import { fileStates } from './stores/file'
  import { IndexedPNG, type StaxGroup } from './types/png.js'
  import { palettesStore } from './stores/palettes.js';
  import PaletteOptionsToolbar from './components/PaletteOptionsToolbar.svelte';
  
  let theme: 'white'|'g10'|'g80'|'g90'|'g100' = 'g90'
  
  let palette: Palette = defaultPalette
  
  type Color = {r: number, g: number, b: number, a: number}
  
  let primaryColor: Color = {r: 0, g: 0, b: 0, a: 0}
  let secondaryColor: Color = {r: 0, g: 0, b: 0, a: 0}
  
  $: primaryColor = palette?.[$brushSettings.primaryIndex]
  $: secondaryColor = palette?.[$brushSettings.secondaryIndex]

  let red: number = 0
  let green: number = 0
  let blue: number = 0
  let alpha: number = 0

  let refreshPalette = {}
  let fakePalette: Palette | undefined = undefined
  let selectedPaletteID: number = 0
  $: {
    if (selectedPaletteID === 0) {
      fakePalette = undefined
    } else if (selectedPaletteID >= 1) {
      if ($palettesStore[selectedPaletteID-1]) {
        fakePalette = $palettesStore[selectedPaletteID-1]
      }
    }
    focusedFile?.canvas.setFakePalette(fakePalette?.swatches)
    focusedFile?.canvas.refreshImageData()
    focusedFile?.canvas.refreshCanvas()
  }

  // Oh no, what are you doing, step palette~
  function stepPalette(step: number, primary: boolean) {
    if (primary) {
      $brushSettings.primaryIndex += step
      if ($brushSettings.primaryIndex < 0) $brushSettings.primaryIndex = focusedFile?.canvas.palette.length-1
      if ($brushSettings.primaryIndex >= focusedFile?.canvas.palette.length) $brushSettings.primaryIndex = 0
    } else {
      $brushSettings.secondaryIndex += step
      if ($brushSettings.secondaryIndex < 0) $brushSettings.secondaryIndex = focusedFile?.canvas.palette.length-1
      if ($brushSettings.secondaryIndex >= focusedFile?.canvas.palette.length) $brushSettings.secondaryIndex = 0
    }
  }
  
  let showOpen: boolean = false
  let showImport: boolean = false
  let showExport: boolean = false
  let showNew: boolean = false
  let showAbout: boolean = false
  let importValid: boolean = false
  let importPNG: IndexedPNG = null
  let importFilepath: string = ''
  let importTitle: string = ''
  let importCanvas: Canvas = null
  let importHandler: () => Promise<LoadedFile> = async () => {
    alert('no import handler!')
    return null
  }
  
  let exportPath: string = ''
  let exportFormat: 'png' = 'png'
  
  let showPreview: boolean = false
  let showPreviewSettings: boolean = false
  let showGridSettings: boolean = false
  let showCheckerboardSettings: boolean = false
  let showThemeSettings: boolean = false
  let showBackgroundSettings: boolean = false

  let previewShowBaseSizeOutline: boolean = true
  let previewBaseSizeOutlineColor: string = '#00FFFF77'
  let previewShowSizeOutline: boolean = true
  let previewSizeOutlineColor: string = '#FFFF0077'
  let previewUseMini: boolean = false

  let toolSelection = new SelectionTool()
  let toolMagicWand = new MagicWandTool()
  let toolFill = new FillTool()
  let toolErase = new EraserTool()
  let toolBrush = new BrushTool()
  let toolSpray = new SprayTool()
  let toolPicker = new PickerTool()
  let toolMove = new MoveTool()
  let currentTool: Tool = toolBrush
  let previousTool: Tool = null
  let brushSize: number = 1
  let brushType: BrushType = 'circle'
  let sprayRadius: number = 16
  let sprayDensity: number = 2
  
  function swapTool(tool: Tool) {
    previousTool = currentTool
    currentTool = tool
  }

  let focusedFileIndex: number = -1
  let focusedFile: LoadedFile = null
  $: {
    if ($fileStates[focusedFileIndex] && focusedFile !== $fileStates[focusedFileIndex]) {
      exportPath = $fileStates[focusedFileIndex].filepath
      console.log('set exportPath', exportPath)
    }
    focusedFile = $fileStates[focusedFileIndex] ?? null
  }
  
  function selectFile(file: LoadedFile, index: number) {
    if (index < 0 || index >= $fileStates.length) return
    focusedFileIndex = index
  }
  
  async function loadPNG() {
    importFilepath = await GetFilePath(
      [ "PNG" ],
      [ "*.png" ],
    )
    let b = (await OpenFileBytes(importFilepath)) as unknown as string
    importTitle = /[^/\\]*$/.exec(importFilepath)[0]
    importPNG = new IndexedPNG(Uint8Array.from(atob(b), (v) => v.charCodeAt(0)))
    await importPNG.decode()
    
    importCanvas = new Canvas(importPNG)

    if (!importPNG.hasStax()) {
      showOpen = true
      return
    }
    fileStates.addFile(new LoadedFile({filepath: importFilepath, title: importTitle, canvas: importCanvas, data: importPNG}))
    focusedFileIndex = $fileStates.length - 1
  }

  function engageOpen() {
    if (importValid) {
      fileStates.addFile(new LoadedFile({filepath: importFilepath, title: importTitle, canvas: importCanvas, data: importPNG}))
      focusedFileIndex = $fileStates.length - 1
      importCanvas = null
      importPNG = null
    }
    showOpen = false
  }
  
  async function engageImport() {
    let file = await importHandler()
    if (file) {
      fileStates.addFile(file)
      focusedFileIndex = $fileStates.length - 1
    }
    showImport = false
  }
  
  async function engageExport() {
    try {
      let data = await focusedFile.canvas.toPNG(focusedFile)
      
      SaveFileBytes(exportPath, [...data])
    } catch(e) {
      alert(e)
    }

    showExport = false
  }
  
  async function engageSaveAs() {
     try {
      let data = await focusedFile.canvas.toPNG(focusedFile)
      let path = await SaveFilePath(focusedFile.filepath)
      SaveFileBytes(path, [...data])
    } catch(e) {
      alert(e)
    }
  }

  function engageNew() {
  console.log('make new', importPNG.groups)
    fileStates.addFile(new LoadedFile({filepath: "", title: 'Untitled', canvas: importCanvas, data: importPNG}))
    focusedFileIndex = $fileStates.length - 1
    importCanvas = null
    importPNG = null

    showNew = false
  }

  function engageQuit() {
    (window as any).runtime.Quit()
  }
  
  function engageCopy() {
    if (!focusedFile) return
    CopyPaste.toLocal(focusedFile.canvas, focusedFile.selection)
  }
  function engageDelete(cut: boolean) {
    if (!focusedFile) return
    focusedFile.capture()
    if (cut) {
      CopyPaste.toLocal(focusedFile.canvas, focusedFile.selection)
    }
    let pixels: PixelPosition[] = []
    for (let y = 0; y < focusedFile.canvas.height; y++) {
      for (let x = 0; x < focusedFile.canvas.width; x++) {
        if (focusedFile.selection.isPixelMarked(x, y)) {
          pixels.push({x, y, index: 0})
        }
      }
    }
    focusedFile.push(new SelectionClearUndoable())
    focusedFile.push(new PixelsPlaceUndoable(pixels))
    focusedFile.release()
  }
  function engagePaste() {
    if (!focusedFile) return
    let cp = CopyPaste.fromLocal()
    let paletteDiff = cp.getPaletteLengthDifference(focusedFile.canvas.palette)
    let missingColors = cp.getMissingPaletteColors(focusedFile.canvas.palette)
    
    // TODO: We need to do the following:
    // 1. If the copying palette has more colors, we need to ask if we want to:
    //    a. Add the missing colors to the current palette
    //    b. Replace the current palette entries with the copying palette entries
    //    c. Remap the copying palette entries, but add the missing colors.
    
    console.log('paste results', paletteDiff, missingColors, cp)
  }

  function closeFile(index: number) {
    fileStates.removeFile(index)
    if (focusedFileIndex === index) {
      focusedFileIndex = Math.min($fileStates.length-1, focusedFileIndex)
    }
  }

  function handlePaletteSelect(event: CustomEvent) {
    let index = event.detail.index
    
    let entry: number = 0

    if (fakePalette) {
      if (index < 0 || index >= fakePalette.swatches.length) return
      entry = fakePalette.swatches[index]
    } else {
      if (index < 0 || index >= focusedFile.canvas.palette.length) return
      entry = focusedFile.canvas.palette[index]
    }
    red = entry & 0xFF
    green = (entry >> 8) & 0xFF
    blue = (entry >> 16) & 0xFF
    alpha = (entry >> 24) & 0xFF
  }
  
  onMount(async () => {
    window.addEventListener('resize', (e: UIEvent) => {
      EventsEmit('window:resize', {width: window.innerWidth, height: window.innerHeight})
    })
  })

</script>

<Theme bind:theme/>
<main>
  <menu class="mainMenu">
    <OverflowMenu size="sm">
      <div slot="menu">File</div>
      <OverflowMenuItem text="New..." on:click={() => showNew = true}/>
      <OverflowMenuItem text="Open PNG..." on:click={loadPNG}/>
      <OverflowMenuItem text="Import..." on:click={()=>showImport = true}/>
      <OverflowMenuItem text="Export to PNG" disabled={focusedFile===null} on:click={() => showExport = true}/>
      <OverflowMenuItem text="Save"/>
      <OverflowMenuItem text="Save As..." on:click={engageSaveAs}/>
      <OverflowMenuItem hasDivider danger text="Quit" on:click={engageQuit}/>
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
      <div slot="menu">View</div>
      <OverflowMenuItem>
        <Checkbox on:click={(e)=>e.stopPropagation()} bind:checked={$editor2DSettings.showGrid} labelText="Grid" />
      </OverflowMenuItem>
      <OverflowMenuItem text="Change Grid..." on:click={()=>showGridSettings = true} />
      <OverflowMenuItem hasDivider>
        <Checkbox on:click={(e)=>e.stopPropagation()} bind:checked={$editor2DSettings.showCheckerboard} labelText="Checkerboard" />
      </OverflowMenuItem>
      <OverflowMenuItem text="Change Checkerboard..." on:click={()=>showCheckerboardSettings = true} />
      <OverflowMenuItem hasDivider text="Background..." on:click={()=>showBackgroundSettings = true} />
      <OverflowMenuItem hasDivider text="Theme..." on:click={()=>showThemeSettings = true} />
      <OverflowMenuItem hasDivider text="Fullscreen" on:click={()=>ToggleFullscreen()} />
    </OverflowMenu>
    <OverflowMenu size="sm">
      <div slot="menu">Mode</div>
      <OverflowMenuItem>
        <label on:click={e=>e.stopPropagation()} on:keypress={e=>e.stopPropagation()}>
          <span>Slice</span>
          <input type='radio' name='view-mode' value='slice' bind:group={$editor2DSettings.viewMode} />
        </label>
      </OverflowMenuItem>
      <OverflowMenuItem>
        <label on:click={e=>e.stopPropagation()} on:keypress={e=>e.stopPropagation()}>
          <span>Frame</span>
          <input type='radio' name='view-mode' value='frame' bind:group={$editor2DSettings.viewMode} />
        </label>
      </OverflowMenuItem>
      <OverflowMenuItem>
        <label on:click={e=>e.stopPropagation()} on:keypress={e=>e.stopPropagation()}>
          <span>Animation</span>
          <input type='radio' name='view-mode' value='animation' bind:group={$editor2DSettings.viewMode} />
        </label>
      </OverflowMenuItem>
      <OverflowMenuItem>
        <label on:click={e=>e.stopPropagation()} on:keypress={e=>e.stopPropagation()}>
          <span>Group</span>
          <input type='radio' name='view-mode' value='group' bind:group={$editor2DSettings.viewMode} />
        </label>
      </OverflowMenuItem>
      <OverflowMenuItem>
        <label on:click={e=>e.stopPropagation()} on:keypress={e=>e.stopPropagation()}>
          <span>Sheet</span>
          <input type='radio' name='view-mode' value='sheet' bind:group={$editor2DSettings.viewMode} />
        </label>
      </OverflowMenuItem>
    </OverflowMenu>
    <OverflowMenu size="sm">
      <div slot="menu">Windows</div>
      <OverflowMenuItem text="Preview" on:click={() => showPreview = true}/>
      <OverflowMenuItem text="Preview Settings..." on:click={() => showPreviewSettings = true}/>
    </OverflowMenu>
    <OverflowMenu size="sm">
      <div slot="menu">Help</div>
      <OverflowMenuItem text="About" on:click={() => showAbout = true}/>
    </OverflowMenu>
  </menu>
  <section class='content'>
    <section class='left'>
      <Dropdown
        size="sm"
        bind:selectedId={selectedPaletteID}
        items={[
          { id: 0, text: "<image>"},
        ].concat($palettesStore.map((p, i) => ({id: i+1, text: p.name})))}
      />
      <section class='palette'>
        <PaletteOptionsToolbar palette={fakePalette}/>
      </section>
      <PaletteSection refresh={refreshPalette} file={focusedFile} fakePalette={fakePalette} on:select={handlePaletteSelect} />
      <article>
        <ColorSelector bind:red bind:green bind:blue bind:alpha />
        <ColorIndex bind:red bind:green bind:blue bind:alpha file={focusedFile} palette={fakePalette} on:refresh={()=>refreshPalette={}} />
      </article>
    </section>
    <menu class='toolbar'>
      <Button isSelected={currentTool === toolMove} kind="ghost" size="small" icon={Move} iconDescription="move" tooltipPosition="right" on:click={()=>swapTool(toolMove)}></Button>
      <Button isSelected={currentTool === toolSelection} kind="ghost" size="small" icon={Select_01} iconDescription="selection" tooltipPosition="right" on:click={()=>swapTool(toolSelection)}></Button>
      <Button isSelected={currentTool === toolMagicWand} kind="ghost" size="small" icon={MagicWand} iconDescription="magic selection" tooltipPosition="right" on:click={()=>swapTool(toolMagicWand)}></Button>
      <hr/>
      <Button isSelected={currentTool === toolBrush} kind="ghost" size="small" icon={PaintBrushAlt} iconDescription="paint" tooltipPosition="right" on:click={()=>swapTool(toolBrush)}></Button>
      <Button isSelected={currentTool === toolSpray} kind="ghost" size="small" icon={SprayPaint} iconDescription="spray" tooltipPosition="right" on:click={()=>swapTool(toolSpray)}></Button>
      <Button isSelected={currentTool === toolPicker} kind="ghost" size="small" icon={Eyedropper} iconDescription="pick" tooltipPosition="right" on:click={()=>swapTool(toolPicker)}></Button>
      <Button isSelected={currentTool === toolErase} kind="ghost" size="small" icon={Erase} iconDescription="erase" tooltipPosition="right" on:click={()=>swapTool(toolErase)}></Button>
      <Button isSelected={currentTool === toolFill} kind="ghost" size="small" icon={RainDrop} iconDescription="fill" tooltipPosition="right" on:click={()=>swapTool(toolFill)}></Button>
      <Shortcuts group='editor2D'>
        <Shortcut global cmd='clear selection' keys={['escape']} on:trigger={()=>focusedFile?.push(new SelectionClearUndoable())} />
        <Shortcut global cmd='selection' keys={['s']} on:trigger={()=>swapTool(toolSelection)} />
        <Shortcut global cmd='magic selection' keys={['shift+s']} on:trigger={()=>swapTool(toolMagicWand)} />
        <Shortcut global cmd='move' keys={['m']} on:trigger={()=>swapTool(toolMove)} />
        <Shortcut global cmd='move left' keys={['arrowleft']} on:trigger={()=>toolMove.shift({file: focusedFile}, {x: -1, y: 0, id: 0})} />
        <Shortcut global cmd='move right' keys={['arrowright']} on:trigger={()=>toolMove.shift({file: focusedFile}, {x: 1, y: 0, id: 0})} />
        <Shortcut global cmd='move up' keys={['arrowup']} on:trigger={()=>toolMove.shift({file: focusedFile}, {x: 0, y: -1, id: 0})} />
        <Shortcut global cmd='move down' keys={['arrowdown']} on:trigger={()=>toolMove.shift({file: focusedFile}, {x: 0, y: 1, id: 0})} />
        <Shortcut global cmd='brush' keys={['b']} on:trigger={()=>swapTool(toolBrush)} />
        <Shortcut global cmd='brushToPicker' keys={['alt']} on:trigger={()=>(currentTool===toolBrush||currentTool===toolSpray)?swapTool(toolPicker):null} on:release={()=>(previousTool===toolBrush||previousTool===toolSpray)&&currentTool===toolPicker?swapTool(previousTool):null} />
        <Shortcut global cmd='previousPrimaryPaletteEntry' keys={['alt+wheelup']} on:trigger={()=>stepPalette(-1, true)}/>
        <Shortcut global cmd='nextPrimaryPaletteEntry' keys={['alt+wheeldown']} on:trigger={()=>stepPalette(1, true)}/>
        <Shortcut global cmd='previousSecondaryPaletteEntry' keys={['alt+shift+wheelup']} on:trigger={()=>stepPalette(-1, false)}/>
        <Shortcut global cmd='nextSecondaryPaletteEntry' keys={['alt+shift+wheeldown']} on:trigger={()=>stepPalette(1, false)}/>
        <Shortcut global cmd='fill' keys={['f']} on:trigger={()=>swapTool(toolFill)} />
        <Shortcut global cmd='picker' keys={['i']} on:trigger={()=>swapTool(toolPicker)} />
        <Shortcut global cmd='erase' keys={['e']} on:trigger={()=>swapTool(toolErase)} />
        <Shortcut global cmd='erase' keys={['p']} on:trigger={()=>swapTool(toolSpray)} />
        <Shortcut global cmd='copy' keys={['ctrl+c']} on:trigger={()=>engageCopy()} />
        <Shortcut global cmd='cut' keys={['ctrl+x']} on:trigger={()=>engageDelete(true)} />
        <Shortcut global cmd='delete' keys={['delete']} on:trigger={()=>engageDelete(false)} />
        <Shortcut global cmd='paste' keys={['ctrl+v']} on:trigger={()=>engagePaste()} />
        <Shortcut global cmd='quit' keys={['ctrl+q']} on:trigger={()=>engageQuit()} />
        <Shortcut global cmd='fullscreen' keys={['f11']} on:trigger={()=>ToggleFullscreen()} />
      </Shortcuts>
    </menu>
    <section class='middle'>
      <menu class='toolsettings'>
        {#if currentTool === toolBrush || currentTool === toolErase}
          <BrushSize bind:brushSize={$brushSettings.size} bind:brushType={$brushSettings.type}/>
          <NumberInput size="sm" min={1} max={100} step={1} bind:value={$brushSettings.size}/>
        {:else if currentTool === toolSpray}
          radius:&nbsp; <NumberInput size="sm" min={1} max={100} step={1} bind:value={$brushSettings.sprayRadius}/>
          density:&nbsp; <NumberInput size="sm" min={1} max={100} step={1} bind:value={$brushSettings.sprayDensity}/>
        {/if}
      </menu>
      <Tabs bind:selected={focusedFileIndex}>
        {#each $fileStates as file, index (file.id)}
          <Tab on:click={()=>selectFile(file, index)} title={file.filepath}>
            <span class='tab'>
              <span>{file.title.substring(0, file.title.lastIndexOf('.')) || file.title}</span>
              <Button size="small" kind="ghost" iconDescription="close" icon={Close} href="#" on:click={(e)=>{e.preventDefault();closeFile(index)}} />
            </span>
          </Tab>
        {/each}
        <svelte:fragment slot="content">
          {#each $fileStates as file, index (file.id)}
            <Shortcuts group='editor2D' active={focusedFile===file}>
              <Shortcut cmd='undo' keys={['ctrl+z']} on:trigger={()=>file.undo()} />
              <Shortcut cmd='redo' keys={['ctrl+y', 'ctrl+shift+z']} on:trigger={()=>file.redo()} />
              <Shortcut global cmd={'swapFile'+index} keys={['F'+(index+1)]} on:trigger={()=>selectFile(file, index)} />
            </Shortcuts>
            <TabContent>
              <Editor2D
                bind:file={file}
                bind:currentTool={currentTool}
              />
            </TabContent>
          {/each}
        </svelte:fragment>
      </Tabs>
    </section>
    <section class='right'>
      <Groups file={focusedFile} />
    </section>
    {#if showPreview}
      <FloatingPanel
        label="Stack Preview"
        noPadding
        bind:open={showPreview}
      >
        <div slot='header-left'>
          <Button size='small' kind='ghost' icon={previewUseMini?Maximize:Minimize} on:click={()=>previewUseMini = !previewUseMini}/>
          </div>
        <StackPreview
          showBaseSizeOutline={previewShowBaseSizeOutline}
          baseSizeOutlineColor={previewBaseSizeOutlineColor}
          showSizeOutline={previewShowSizeOutline}
          sizeOutlineColor={previewSizeOutlineColor}
          shronked={previewUseMini}
        />
      </FloatingPanel>
    {/if}
    {#if showPreviewSettings}
      <PreviewSettingsModal
        bind:open={showPreviewSettings}
        bind:showBaseSizeOutline={previewShowBaseSizeOutline}
        bind:baseSizeOutlineColor={previewBaseSizeOutlineColor}
        bind:showSizeOutline={previewShowSizeOutline}
        bind:sizeOutlineColor={previewSizeOutlineColor}
      />
    {/if}
    {#if showGridSettings}
      <GridSettingsModal bind:open={showGridSettings}/>
    {/if}
    {#if showCheckerboardSettings}
      <CheckerboardSettingsModal bind:open={showCheckerboardSettings}/>
    {/if}
    {#if showBackgroundSettings}
      <BackgroundSettingsModal bind:open={showBackgroundSettings}/>
    {/if}
    {#if showThemeSettings}
      <ThemeSettingsModal bind:open={showThemeSettings} bind:theme={theme} />
    {/if}
  </section>

</main>
{#if showOpen}
  <ComposedModal bind:open={showOpen} size="sm" preventCloseOnClickOutside on:click:button--primary={engageOpen}>
    <Open
      bind:open={showOpen}
      bind:valid={importValid}
      bind:canvas={importCanvas}
      bind:png={importPNG}
    />
  </ComposedModal>
{/if}
{#if showImport}
  <ComposedModal bind:open={showImport} size="sm" preventCloseOnClickOutside on:click:button--primary={engageImport}>
    <Import
      bind:open={showImport}
      bind:onImport={importHandler}
    />
  </ComposedModal>
{/if}
<ComposedModal bind:open={showExport} size="sm" preventCloseOnClickOutside on:click:button--primary={engageExport}>
  <Exporter
    bind:open={showExport}
    bind:path={exportPath}
    bind:format={exportFormat}
  />
</ComposedModal>

{#if showNew}
  <ComposedModal bind:open={showNew} size="sm" preventCloseOnClickOutside on:click:button--primary={engageNew}>
    <New
      bind:open={showNew}
      bind:canvas={importCanvas}
      bind:png={importPNG}
    />
  </ComposedModal>
{/if}

<ComposedModal bind:open={showAbout} size="sm" preventCloseOnClickOutside on:click:button--primary={engageNew}>
  <About bind:open={showAbout} />
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
    grid-template-columns: 1fr auto 4fr 1fr;
    grid-template-rows: minmax(0, 1fr);
  }
  .left {
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
  }
  .right {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
  }
  .toolbar {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    padding-top: 2rem;
  }
  .toolsettings {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    min-height: 2rem;
  }
  :global(menu.toolsettings > .bx--form-item) {
    flex: initial;
  }
  .middle {
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
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
    direction: rtl;
  }
  :global(.middle .bx--tabs__nav-link) {
    position: relative;
    height: 1rem;
  }
  :global(.middle .bx--tabs) {
    min-height: 1.4rem;
  }
  :global(.middle .bx--tabs .bx--btn) {
    padding-top: 0;
    top: -.25rem;
  }
  hr {
    width: 50%;
    height: 1px;
    border: none;
    background-color: var(--cds-text-02, #c6c6c6);
    margin: 0.5rem 0;
  }
</style>
