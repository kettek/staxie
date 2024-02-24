<script lang="ts">
  import type { data } from '../wailsjs/go/models.js'
  import Editor2D from './sections/Editor2D.svelte'
  import Importer from './sections/Importer.svelte';
  import PaletteSection from './sections/Palette.svelte'
  import FloatingPanel from './components/FloatingPanel.svelte'
  import { Palette, PaletteEntry, defaultPalette, type Color } from './types/palette'

  import { LoadedFile, PixelsPlaceUndoable, SelectionClearUndoable, SelectionSetUndoable } from './types/file'

  import "carbon-components-svelte/css/all.css"
  import { Tabs, Tab, TabContent, Theme, Button, Modal, Truncate, ButtonSet, NumberInput, Dropdown, Checkbox, TextInput } from "carbon-components-svelte"
  import { ComposedModal } from "carbon-components-svelte"
  
  import { OverflowMenu, OverflowMenuItem } from "carbon-components-svelte"

  import { Close, Erase, PaintBrushAlt, RainDrop, Redo, Select_01, Undo, Scale, Eyedropper, Move, MagicWand, SprayPaint } from "carbon-icons-svelte"
  import StackPreview from './sections/StackPreview.svelte'
  import type { Canvas } from './types/canvas'
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
  
  let theme: 'white'|'g10'|'g80'|'g90'|'g100' = 'g90'
  
  let palette: Palette = defaultPalette()
  let primaryColorIndex: number = 1
  let secondaryColorIndex: number = 0
  
  let primaryColor: Color = {r: 0, g: 0, b: 0, a: 0}
  let secondaryColor: Color = {r: 0, g: 0, b: 0, a: 0}
  
  $: primaryColor = palette?.[primaryColorIndex]
  $: secondaryColor = palette?.[secondaryColorIndex]

  let red: number = 0
  let green: number = 0
  let blue: number = 0
  let alpha: number = 0

  let refreshPalette = {}
  let fakePalette: Uint32Array | undefined = undefined
  let selectedPaletteID: number = 0
  $: {
    if (selectedPaletteID === 0) {
      fakePalette = undefined
    } else if (selectedPaletteID === 1) {
      fakePalette = new Uint32Array([
        0xFFE0F8D0, 0xFF88C070, 0xFF346856, 0xFF081820,
        0xFFF8F8F8, 0xFFC0C0C0, 0xFF606060, 0xFF202020,
        0xFFF8D8F8, 0xFFA800A8, 0xFF503050, 0xFF200020,
        0xFFF8B8F8, 0xFFA800A8, 0xFF503050, 0xFF200020,
      ])
    }
    focusedFile?.canvas.setFakePalette(fakePalette)
    focusedFile?.canvas.refreshImageData()
    focusedFile?.canvas.refreshCanvas()
  }

  // Oh no, what are you doing, step palette~
  function stepPalette(step: number, primary: boolean) {
    if (primary) {
      primaryColorIndex += step
      if (primaryColorIndex < 0) primaryColorIndex = focusedFile?.canvas.palette.length-1
      if (primaryColorIndex >= focusedFile?.canvas.palette.length) primaryColorIndex = 0
    } else {
      secondaryColorIndex += step
      if (secondaryColorIndex < 0) secondaryColorIndex = focusedFile?.canvas.palette.length-1
      if (secondaryColorIndex >= focusedFile?.canvas.palette.length) secondaryColorIndex = 0
    }
  }
  
  let showImport: boolean = false
  let showNew: boolean = false
  let importValid: boolean = false
  let importFile: data.StackistFileV1 = null
  let importFilepath: string = ''
  let importCanvas: Canvas = null
  
  let showPreview: boolean = false
  let showGridSettings: boolean = false
  let showCheckerboardSettings: boolean = false
  let showThemeSettings: boolean = false
  let showBackgroundSettings: boolean = false

  let showGrid: boolean = true
  let showCheckerboard: boolean = true

  let gridMajorSize: number = 16
  let gridMinorSize: number = 8
  let gridMajorColor: string = '#0000ff'
  let gridMinorColor: string = '#006666'

  let checkerboardSize: number = 8
  let checkerboardColor1: string = '#888888'
  let checkerboardColor2: string = '#444444'

  let backgroundColor: string = '#111111'
  
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

  let refresh = {}

  let files: LoadedFile[] = []
  let focusedFileIndex: number = -1
  let focusedFile: LoadedFile = null
  $: focusedFile = files[focusedFileIndex] ?? null
  
  function selectFile(file: LoadedFile, index: number) {
    if (index < 0 || index >= files.length) return
    focusedFileIndex = index
    refresh = {}
  }

  function engageImport() {
    if (importValid) {
      files = [...files, new LoadedFile({filepath: importFilepath, title: importFilepath, canvas: importCanvas, data: importFile})]
      focusedFileIndex = files.length - 1
      importCanvas = null
      importFile = null
    }
    showImport = false
  }

  function engageNew() {
    files = [...files, new LoadedFile({filepath: "", title: 'Untitled', canvas: importCanvas, data: importFile})]
    focusedFileIndex = files.length - 1
    importCanvas = null
    importFile = null

    showNew = false
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
    files = files.filter((_,i)=>i!==index)
    if (focusedFileIndex === index) {
      focusedFileIndex = Math.min(files.length-1, focusedFileIndex)
    }
  }

  function handlePaletteSelect(event: CustomEvent) {
    let index = event.detail.index

    if (index < 0 || index >= focusedFile.canvas.palette.length) return

    let entry = focusedFile.canvas.palette[index]
    red = entry & 0xFF
    green = (entry >> 8) & 0xFF
    blue = (entry >> 16) & 0xFF
    alpha = (entry >> 24) & 0xFF
  }
</script>

<Theme bind:theme/>
<main>
  <menu class="mainMenu">
    <OverflowMenu size="sm">
      <div slot="menu">File</div>
      <OverflowMenuItem text="New..." on:click={() => showNew = true}/>
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
      <div slot="menu">View</div>
      <OverflowMenuItem>
        <Checkbox on:click={(e)=>e.stopPropagation()} bind:checked={showGrid} labelText="Grid" />
      </OverflowMenuItem>
      <OverflowMenuItem text="Change Grid..." on:click={()=>showGridSettings = true} />
      <OverflowMenuItem hasDivider>
        <Checkbox on:click={(e)=>e.stopPropagation()} bind:checked={showCheckerboard} labelText="Checkerboard" />
      </OverflowMenuItem>
      <OverflowMenuItem text="Change Checkerboard..." on:click={()=>showCheckerboardSettings = true} />
      <OverflowMenuItem hasDivider text="Background..." on:click={()=>showBackgroundSettings = true} />
      <OverflowMenuItem hasDivider text="Theme..." on:click={()=>showThemeSettings = true} />
    </OverflowMenu>
    <OverflowMenu size="sm">
      <div slot="menu">Windows</div>
      <OverflowMenuItem text="Preview" on:click={() => showPreview = true}/>
    </OverflowMenu>
  </menu>
  <section class='content'>
    <section class='left'>
      <Dropdown
        size="sm"
        bind:selectedId={selectedPaletteID}
        items={[
          { id: 0, text: "<image>"},
          { id: 1, text: "test palette"},
        ]}
      />
      <PaletteSection refresh={refreshPalette} bind:primaryColorIndex bind:secondaryColorIndex file={focusedFile} fakePalette={fakePalette} on:select={handlePaletteSelect} />
      <article>
        <ColorSelector bind:red bind:green bind:blue bind:alpha />
        <ColorIndex bind:red bind:green bind:blue bind:alpha index={primaryColorIndex} file={focusedFile} on:refresh={()=>refreshPalette={}} />
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
      </Shortcuts>
    </menu>
    <section class='middle'>
      <menu class='toolsettings'>
        {#if currentTool === toolBrush || currentTool === toolErase}
          <BrushSize bind:brushSize bind:brushType/>
          <NumberInput size="sm" min={1} max={100} step={1} bind:value={brushSize}/>
        {:else if currentTool === toolSpray}
          radius:&nbsp; <NumberInput size="sm" min={1} max={100} step={1} bind:value={sprayRadius}/>
          density:&nbsp; <NumberInput size="sm" min={1} max={100} step={1} bind:value={sprayDensity}/>
        {/if}
      </menu>
      <Tabs bind:selected={focusedFileIndex}>
        {#each files as file, index}
          <Tab on:click={()=>selectFile(file, index)}>
            <span class='tab'>
              <span>{file.title}</span>
              <Button size="small" kind="ghost" iconDescription="close" icon={Close} href="#" on:click={(e)=>{e.preventDefault();closeFile(index)}} />
            </span>
          </Tab>
        {/each}
        <svelte:fragment slot="content">
          {#each files as file, index}
            <Shortcuts group='editor2D' active={focusedFile===file}>
              <Shortcut cmd='undo' keys={['ctrl+z']} on:trigger={()=>file.undo()} />
              <Shortcut cmd='redo' keys={['ctrl+y', 'ctrl+shift+z']} on:trigger={()=>file.redo()} />
              <Shortcut global cmd={'swapFile'+index} keys={['F'+(index+1)]} on:trigger={()=>selectFile(file, index)} />
            </Shortcuts>
            <TabContent>
              <Editor2D
                bind:file={file}
                refresh={refresh}
                bind:primaryColorIndex={primaryColorIndex}
                bind:secondaryColorIndex={secondaryColorIndex}
                bind:currentTool={currentTool}
                brushSize={brushSize}
                brushType={brushType}
                sprayDensity={sprayDensity}
                sprayRadius={sprayRadius}
                showCheckerboard={showCheckerboard}
                checkerboardSize={checkerboardSize}
                checkerboardColor1={checkerboardColor1}
                checkerboardColor2={checkerboardColor2}
                showGrid={showGrid}
                backgroundColor={backgroundColor}
                gridMajorColor={gridMajorColor}
                gridMinorColor={gridMinorColor}
                gridMajorSize={gridMajorSize}
                gridMinorSize={gridMinorSize}
              />
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
    {#if showGridSettings}
      <GridSettingsModal bind:open={showGridSettings} bind:majorSize={gridMajorSize} bind:minorSize={gridMinorSize} bind:majorColor={gridMajorColor} bind:minorColor={gridMinorColor} />
    {/if}
    {#if showCheckerboardSettings}
      <CheckerboardSettingsModal bind:open={showCheckerboardSettings} bind:size={checkerboardSize} bind:color1={checkerboardColor1} bind:color2={checkerboardColor2} />
    {/if}
    {#if showBackgroundSettings}
      <BackgroundSettingsModal bind:open={showBackgroundSettings} bind:color={backgroundColor} />
    {/if}
    {#if showThemeSettings}
      <ThemeSettingsModal bind:open={showThemeSettings} bind:theme={theme} />
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
<ComposedModal bind:open={showNew} size="sm" preventCloseOnClickOutside on:click:button--primary={engageNew}>
  <New bind:open={showNew} bind:canvas={importCanvas} bind:file={importFile} />
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
    grid-template-rows: auto auto minmax(0, 1fr);
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
