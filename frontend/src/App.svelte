<script lang="ts">
  import { GetFilePath, OpenFileBytes, SaveFilePath, ToggleFullscreen } from '../wailsjs/go/main/App.js'
  import { EventsEmit } from '../wailsjs/runtime/runtime.js'
  import Editor2D from './sections/Editor2D.svelte'
  import Open from './sections/Open.svelte'
  import Import from './sections/Import.svelte'
  import PaletteSection from './sections/Palette.svelte'
  import FloatingPanel from './components/FloatingPanel.svelte'
  import { Palette } from './types/palette'
  
  import { brushSettings } from './stores/brush'
  import { editor2DSettings } from './stores/editor2d.js'
  import { editor3DSettings } from './stores/editor3d.js'
  import { logSettings } from './stores/log.js'

  import { LoadedFile } from './types/file'
  import { ChangeColorModeUndoable, PixelsPlaceUndoable, SelectionClearUndoable, ThreeDSelectionBoxClearUndoable, ThreeDSelectionBoxSetVoxelsUndoable } from './types/file/undoables'

  import "carbon-components-svelte/css/all.css"
  import { Tabs, Tab, TabContent, Theme, NumberInput, Dropdown, Checkbox } from "carbon-components-svelte"
  import Button from './components/common/Button.svelte'
  import { ComposedModal } from "carbon-components-svelte"
  
  import { OverflowMenu, OverflowMenuItem } from "carbon-components-svelte"

  import { Close, Erase, PaintBrushAlt, RainDrop, Redo, Select_01, Undo, Eyedropper, Move, MagicWand, SprayPaint, Maximize, Minimize, WatsonHealth3DSoftware, WatsonHealth3DCursor, SquareOutline, CircleOutline, CircleDash, Chart_3D, WatsonHealth3DMprToggle, ImageReference } from "carbon-icons-svelte"
  import StackPreview from './sections/StackPreview.svelte'
  import { Canvas } from './types/canvas'
  import BrushSize from './components/BrushSize.svelte'
  import Shortcut from './components/Shortcut.svelte'
  import Shortcuts from './components/Shortcuts.svelte'
  import { CopyPaste, ThreeDCopyPaste } from './types/copypaste'
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
  import Stacks from './sections/Stacks.svelte'
  import { fileStates } from './stores/file'
  import { IndexedPNG, type StaxStack } from './types/png.js'
  import { palettesStore } from './stores/palettes.js';
  import PaletteOptionsToolbar from './components/PaletteOptionsToolbar.svelte';
  import Editor3D from './sections/Editor3D.svelte'
  import Frames from './sections/Frames.svelte'
  
  import { toolRectangularSelection, toolMagicWand, toolFill, toolErase, toolBrush, toolEllipse, toolSpray, toolPicker, toolMove, toolSettings, toolVoxelPlace, toolVoxelReplace, toolRectangle, toolEllipseSelection, toolVoxelCursor, toolVoxelBoxSelection, toolReference } from './stores/tool'
  import ColorMode from './sections/ColorMode.svelte'
  import TabTitle from './components/TabTitle.svelte'
  import VioUpdater from './sections/VioUpdater.svelte'
  import ImageReferenceTool from './components/2d/imageReferenceTool.svelte'
  import RichPresence from './sections/RichPresence.svelte'
  import Split from './components/common/Split.svelte'

  let useRichPresence: boolean = false
  let is3D: boolean = false
  
  let theme: 'white'|'g10'|'g80'|'g90'|'g100' = 'g90'
  
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
    $fileStates.focused?.canvas.setFakePalette(fakePalette?.swatches)
    $fileStates.focused?.canvas.refreshImageData()
    $fileStates.focused?.canvas.refreshCanvas()
  }

  // Oh no, what are you doing, step palette~
  function stepPalette(step: number, primary: boolean) {
    if (primary) {
      $brushSettings.primaryIndex += step
      if ($brushSettings.primaryIndex < 0) $brushSettings.primaryIndex = $fileStates.focused?.canvas.palette.length-1
      if ($brushSettings.primaryIndex >= $fileStates.focused?.canvas.palette.length) $brushSettings.primaryIndex = 0
    } else {
      $brushSettings.secondaryIndex += step
      if ($brushSettings.secondaryIndex < 0) $brushSettings.secondaryIndex = $fileStates.focused?.canvas.palette.length-1
      if ($brushSettings.secondaryIndex >= $fileStates.focused?.canvas.palette.length) $brushSettings.secondaryIndex = 0
    }
  }
  
  let showOpen: boolean = false
  let showImport: boolean = false
  let showNew: boolean = false
  let showAbout: boolean = false
  let importValid: boolean = false
  let importPNG: IndexedPNG|null = null
  let importFilepath: string = ''
  let importTitle: string = ''
  let importCanvas: Canvas|null = null
  let importHandler: () => Promise<LoadedFile|null> = async () => {
    alert('no import handler!')
    return null
  }
  
  let exportPath: string = ''
  let exportFormat: 'png' = 'png'

  let showColorMode: boolean = false
  let newColorMode: boolean = false
  
  let showPreview: boolean = false
  let showPreviewSettings: boolean = false
  let showGridSettings: boolean = false
  let showCheckerboardSettings: boolean = false
  let showThemeSettings: boolean = false
  let showBackgroundSettings: boolean = false

  let showUpdater: boolean = false

  let previewUseMini: boolean = false
  
  let orthographicCamera: boolean = false

  function selectFile(file: LoadedFile, index: number, id: number) {
    if (index < 0 || index >= fileStates.length()) return
    
    if ($fileStates.focused !== file) {
      exportPath = file.filepath
    }
    $fileStates.focusedIndex = index
    $fileStates.focused = file
  }
  
  function toggle3D(e: InputEvent) {
    const target = e.currentTarget as HTMLInputElement
    is3D = target.checked
    if (is3D) {
      toolSettings.store("2D")
      if (!toolSettings.restore("3D")) {
        toolSettings.swapTool(toolVoxelPlace)
      }
    } else {
      toolSettings.store("3D")
      if (!toolSettings.restore("2D")) {
        toolSettings.swapTool(toolBrush)
      }
    }
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
    let file = new LoadedFile({filepath: importFilepath, title: importTitle, canvas: importCanvas, data: importPNG})
    fileStates.addFile(file)
    selectFile(file, fileStates.length()-1, file.id)
  }

  function engageOpen() {
    if (importValid) {
      let file = new LoadedFile({filepath: importFilepath, title: importTitle, canvas: importCanvas, data: importPNG})
      fileStates.addFile(file)
      selectFile(file, fileStates.length()-1, file.id)
      importCanvas = null
      importPNG = null
    }
    showOpen = false
  }
  
  async function engageImport() {
    let file = await importHandler()
    if (file) {
      fileStates.addFile(file)
      selectFile(file, fileStates.length()-1, file.id)
    }
    showImport = false
  }
  
  async function engageSave() {
    if (!$fileStates.focused) return
    try {
      let data = await $fileStates.focused.canvas.toPNG($fileStates.focused)
      SaveFileBytes($fileStates.focused.filepath, [...data])
      $fileStates.focused.markSaved()
      $fileStates.focused.refresh()
      fileStates.refresh()
    } catch(e) {
      alert(e)
    }
  }
  
  async function engageSaveAs() {
    if (!$fileStates.focused) return
     try {
      let data = await $fileStates.focused.canvas.toPNG($fileStates.focused)
      let path = await SaveFilePath($fileStates.focused.filepath)
      if (path === "") return
      SaveFileBytes(path, [...data])
      $fileStates.focused.filepath = path
      $fileStates.focused.title = /[^/\\]*$/.exec(path)[0]
      $fileStates.focused.markSaved()
      fileStates.refresh()
    } catch(e) {
      alert(e)
    }
  }

  function engageNew() {
    let file = new LoadedFile({filepath: "", title: 'Untitled', canvas: importCanvas, data: importPNG})
    fileStates.addFile(file)
    selectFile(file, fileStates.length()-1, file.id)
    importCanvas = null
    importPNG = null

    showNew = false
  }

  function engageQuit() {
    (window as any).runtime.Quit()
  }
  
  function engageCopy() {
    if (!$fileStates.focused) return
    if (is3D) {
      ThreeDCopyPaste.copy($fileStates.focused)
      return
    }
    CopyPaste.toLocal($fileStates.focused.canvas, $fileStates.focused.selection)
  }
  function engageDelete(cut: boolean) {
    if (!$fileStates.focused) return
    $fileStates.focused.capture()
    if (cut) {
      CopyPaste.toLocal($fileStates.focused.canvas, $fileStates.focused.selection)
    }
    let pixels: PixelPosition[] = []
    for (let y = 0; y < $fileStates.focused.canvas.height; y++) {
      for (let x = 0; x < $fileStates.focused.canvas.width; x++) {
        if ($fileStates.focused.selection.isPixelMarked(x, y)) {
          pixels.push({x, y, index: 0})
        }
      }
    }
    $fileStates.focused.push(new SelectionClearUndoable())
    $fileStates.focused.push(new PixelsPlaceUndoable(pixels))
    $fileStates.focused.release()
  }
  function engagePaste() {
    if (!$fileStates.focused) return
    if (is3D) return
    let cp = CopyPaste.fromLocal()
    let paletteDiff = cp.getPaletteLengthDifference($fileStates.focused.canvas.palette)
    let missingColors = cp.getMissingPaletteColors($fileStates.focused.canvas.palette)
    
    // TODO: We need to do the following:
    // 1. If the copying palette has more colors, we need to ask if we want to:
    //    a. Add the missing colors to the current palette
    //    b. Replace the current palette entries with the copying palette entries
    //    c. Remap the copying palette entries, but add the missing colors.
    
    console.log('paste results', paletteDiff, missingColors, cp)
  }

  function engageColorMode() {
    if (!$fileStates.focused) return
    $fileStates.focused.push(new ChangeColorModeUndoable(newColorMode))
    showColorMode = false
  }

  function closeFile(index: number) {
    fileStates.removeFile(index)
    let nextIndex = index
    if ($fileStates.focusedIndex === index) {
      if (nextIndex >= fileStates.length()) nextIndex--
      if (nextIndex < 0) nextIndex = 0
    }
    let file = fileStates.getFile(nextIndex)
    if (file) {
      selectFile(file, nextIndex, file.id)
    } else {
      $fileStates.focusedIndex = -1
      $fileStates.focused = null
    }
    fileStates.refresh()
  }

  function handlePaletteSelect(event: CustomEvent) {
    let index = event.detail.index
    
    let entry: number = 0

    if (fakePalette) {
      if (index < 0 || index >= fakePalette.swatches.length) return
      entry = fakePalette.swatches[index]
    } else {
      if (index < 0 || index >= $fileStates.focused.canvas.palette.length) return
      entry = $fileStates.focused.canvas.palette[index]
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
      <OverflowMenuItem text="Save" on:click={engageSave}/>
      <OverflowMenuItem text="Save As..." on:click={engageSaveAs}/>
      <OverflowMenuItem disabled={!$fileStates.focused} text="Update..." on:click={()=>showUpdater = true}/>
      <OverflowMenuItem hasDivider danger text="Quit" on:click={engageQuit}/>
    </OverflowMenu>
    <OverflowMenu size="sm">
      <div slot="menu">Edit</div>
      <OverflowMenuItem on:click={() => $fileStates.focused?.undo()} disabled={!$fileStates.focused?.canUndo()}>
        Undo &nbsp; <Undo/>
      </OverflowMenuItem>
      <OverflowMenuItem on:click={() => $fileStates.focused?.redo()} disabled={!$fileStates.focused?.canRedo()}>
        Redo &nbsp; <Redo/>
      </OverflowMenuItem>
      <OverflowMenuItem hasDivider on:click={() => $fileStates.focused?.repeat()} disabled={!$fileStates.focused}>
        Repeat Last
      </OverflowMenuItem>
    </OverflowMenu>
    <OverflowMenu size="sm">
      <div slot="menu">Image</div>
      <OverflowMenuItem text="Color Mode..." on:click={() => showColorMode = true}/>
    </OverflowMenu>
    <OverflowMenu size="sm">
      <div slot="menu">View</div>
      <OverflowMenuItem>
        <label on:click={e=>e.stopPropagation()} on:keypress={e=>e.stopPropagation()}>
          <span>2D</span>
          <input type='radio' name='view-mode' value='2d' bind:group={$editor2DSettings.editorMode} />
        </label>
      </OverflowMenuItem>
      <OverflowMenuItem>
        <label on:click={e=>e.stopPropagation()} on:keypress={e=>e.stopPropagation()}>
          <span>3D</span>
          <input type='radio' name='view-mode' value='3d' bind:group={$editor2DSettings.editorMode} />
        </label>
      </OverflowMenuItem>
      <OverflowMenuItem>
        <label on:click={e=>e.stopPropagation()} on:keypress={e=>e.stopPropagation()}>
          <span>2D & 3D</span>
          <input type='radio' name='view-mode' value='both' bind:group={$editor2DSettings.editorMode} />
        </label>
      </OverflowMenuItem>
      <OverflowMenuItem hasDivider>
        <Checkbox on:click={(e)=>e.stopPropagation()} checked={is3D} on:change={toggle3D} labelText="3D" />
      </OverflowMenuItem>
      <OverflowMenuItem>
        <Checkbox on:click={(e)=>e.stopPropagation()} bind:checked={orthographicCamera} labelText="Orthographic" disabled={!is3D} />
      </OverflowMenuItem>
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
    {#if is3D}
      <OverflowMenu size="sm">
        <div slot="menu">3D</div>
        <OverflowMenuItem>
          <Checkbox on:click={(e)=>e.stopPropagation()} bind:checked={$editor3DSettings.showCursor} labelText="Cursor" />
        </OverflowMenuItem>
        <OverflowMenuItem>
          <Checkbox on:click={(e)=>e.stopPropagation()} bind:checked={$editor3DSettings.ignoreAlpha} labelText="Ignore Alpha" />
        </OverflowMenuItem>
        <OverflowMenuItem>
          <Checkbox on:click={(e)=>e.stopPropagation()} bind:checked={$editor3DSettings.hideTransparent} labelText="Hide Transparent" />
        </OverflowMenuItem>
        <OverflowMenuItem hasDivider text="Fill X">
          <Checkbox on:click={(e)=>e.stopPropagation()} bind:checked={$editor3DSettings.floodFillX} labelText="Flood X" />
        </OverflowMenuItem>
        <OverflowMenuItem hasDivider text="Fill Y">
          <Checkbox on:click={(e)=>e.stopPropagation()} bind:checked={$editor3DSettings.floodFillY} labelText="Flood Y" />
        </OverflowMenuItem>
        <OverflowMenuItem hasDivider text="Fill Z">
          <Checkbox on:click={(e)=>e.stopPropagation()} bind:checked={$editor3DSettings.floodFillZ} labelText="Flood Z" />
        </OverflowMenuItem>
      </OverflowMenu>
    {/if}
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
          <span>Stack</span>
          <input type='radio' name='view-mode' value='stack' bind:group={$editor2DSettings.viewMode} />
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
      <div slot="menu">Other</div>
      <OverflowMenuItem>
        <Checkbox on:click={(e)=>e.stopPropagation()} bind:checked={useRichPresence} labelText="Rich Presence" />
      </OverflowMenuItem>
    </OverflowMenu>
    <OverflowMenu size="sm">
      <div slot="menu">Help</div>
      <OverflowMenuItem text="About" on:click={() => showAbout = true}/>
      <OverflowMenuItem>
        <Checkbox on:click={(e)=>e.stopPropagation()} on:change={(e)=>e.target.checked?logSettings.setLevel('debug'):logSettings.setLevel('info')} checked={$logSettings.level==='debug'} labelText="Debug Logging" />
      </OverflowMenuItem>
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
        <PaletteOptionsToolbar palette={fakePalette} file={$fileStates.focused}/>
      </section>
      <PaletteSection refresh={refreshPalette} file={$fileStates.focused} fakePalette={fakePalette} on:select={handlePaletteSelect} />
      <article>
        <ColorSelector bind:red bind:green bind:blue bind:alpha />
        <ColorIndex bind:red bind:green bind:blue bind:alpha file={$fileStates.focused} palette={fakePalette} on:refresh={()=>refreshPalette={}} />
      </article>
    </section>
    <menu class='toolbar'>
      {#if is3D}
        <Button selected={$toolSettings.current === toolVoxelPlace} kind="ghost" size="small" icon={WatsonHealth3DSoftware} tooltip="place" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolVoxelPlace)}></Button>
        <Button selected={$toolSettings.current === toolVoxelReplace} kind="ghost" size="small" icon={WatsonHealth3DCursor} tooltip="replace" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolVoxelReplace)}></Button>
        <Button selected={$toolSettings.current === toolPicker} kind="ghost" size="small" icon={Eyedropper} tooltip="pick" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolPicker)}></Button>
        <Button selected={$toolSettings.current === toolErase} kind="ghost" size="small" icon={Erase} tooltip="erase" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolErase)}></Button>
        <Button selected={$toolSettings.current === toolFill} kind="ghost" size="small" icon={RainDrop} tooltip="fill" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolFill)}></Button>
        <hr />
        <Button selected={$toolSettings.current === toolVoxelCursor} kind="ghost" size="small" icon={Chart_3D} tooltip="3D cursor" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolVoxelCursor)}></Button>
        <Button selected={$toolSettings.current === toolVoxelBoxSelection} kind="ghost" size="small" icon={WatsonHealth3DMprToggle} tooltip="box selection" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolVoxelBoxSelection)}></Button>
        <Shortcuts group='editor3D'>
          <Shortcut global cmd='brush' keys={['b']} on:trigger={()=>toolSettings.swapTool(toolVoxelPlace)} />
          <Shortcut global cmd='replace' keys={['r']} on:trigger={()=>toolSettings.swapTool(toolVoxelReplace)} />
          <Shortcut global cmd='picker' keys={['i']} on:trigger={()=>toolSettings.swapTool(toolPicker)} />
          <Shortcut global cmd='erase' keys={['e']} on:trigger={()=>toolSettings.swapTool(toolErase)} />
          <Shortcut global cmd='fill' keys={['f']} on:trigger={()=>toolSettings.swapTool(toolFill)} />
          <Shortcut global cmd='placeToPicker' keys={['alt']} on:trigger={()=>($toolSettings.current===toolVoxelPlace||$toolSettings.current===toolVoxelReplace||$toolSettings.current===toolFill)?toolSettings.swapTool(toolPicker):null} on:release={()=>($toolSettings.previous===toolVoxelPlace||$toolSettings.previous===toolVoxelReplace||$toolSettings.previous===toolFill)&&$toolSettings.current===toolPicker?toolSettings.swapTool($toolSettings.previous):null} />
          <Shortcut global cmd='cursor' keys={['c']} on:trigger={()=>toolSettings.swapTool(toolVoxelCursor)} />
          <Shortcut global cmd='selection' keys={['s']} on:trigger={()=>toolSettings.swapTool(toolVoxelBoxSelection)} />
          <Shortcut global cmd='clear selection' keys={['escape']} on:trigger={()=>$fileStates.focused?.push(new ThreeDSelectionBoxClearUndoable())} />
          <Shortcut global cmd='clear paste' keys={['escape']} on:trigger={()=>{}} />
          <Shortcut global cmd='copy' keys={['ctrl+c']} on:trigger={()=>engageCopy()} />
          <Shortcut global cmd='delete' keys={['delete']} on:trigger={()=>$fileStates.focused?.push(new ThreeDSelectionBoxSetVoxelsUndoable($fileStates.focused?.stackName, $fileStates.focused?.animationName, $fileStates.focused?.frameIndex, $fileStates.focused.threeDCursor1, $fileStates.focused.threeDCursor2, 0))} />
          <Shortcut global cmd='paste' keys={['ctrl+v']} on:trigger={()=>{}} />
          <Shortcut global cmd='apply paste' keys={['enter']} on:trigger={()=>{}} />
          <Shortcut global cmd='previousSlice' keys={['shift+wheelup']} on:trigger={()=>$fileStates.focused?.setSliceIndex($fileStates.focused?.sliceIndex-1)} />
          <Shortcut global cmd='nextSlice' keys={['shift+wheeldown']} on:trigger={()=>$fileStates.focused?.setSliceIndex($fileStates.focused?.sliceIndex+1)} />
        </Shortcuts>
      {:else}
        <Button selected={$toolSettings.current === toolMove} kind="ghost" size="small" icon={Move} tooltip="move" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolMove)}></Button>
        <Button selected={$toolSettings.current === toolRectangularSelection} kind="ghost" size="small" icon={Select_01} tooltip="rectangular selection" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolRectangularSelection)}></Button>
        <Button selected={$toolSettings.current === toolEllipseSelection} kind="ghost" size="small" icon={CircleDash} tooltip="ellipse selection" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolEllipseSelection)}></Button>
        <Button selected={$toolSettings.current === toolMagicWand} kind="ghost" size="small" icon={MagicWand} tooltip="magic selection" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolMagicWand)}></Button>
        <hr/>
        <Button selected={$toolSettings.current === toolBrush} kind="ghost" size="small" icon={PaintBrushAlt} tooltip="paint" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolBrush)}></Button>
        <Button selected={$toolSettings.current === toolSpray} kind="ghost" size="small" icon={SprayPaint} tooltip="spray" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolSpray)}></Button>
        <Button selected={$toolSettings.current === toolRectangle} kind="ghost" size="small" icon={SquareOutline} tooltip="rectangle" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolRectangle)}></Button>
        <Button selected={$toolSettings.current === toolEllipse} kind="ghost" size="small" icon={CircleOutline} tooltip="ellipse" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolEllipse)}></Button>
        <Button selected={$toolSettings.current === toolPicker} kind="ghost" size="small" icon={Eyedropper} tooltip="pick" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolPicker)}></Button>
        <Button selected={$toolSettings.current === toolErase} kind="ghost" size="small" icon={Erase} tooltip="erase" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolErase)}></Button>
        <Button selected={$toolSettings.current === toolFill} kind="ghost" size="small" icon={RainDrop} tooltip="fill" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolFill)}></Button>
        <hr />
        <Button selected={$toolSettings.current === toolReference} kind="ghost" size="small" icon={ImageReference} tooltip="reference" tooltipPosition="right" on:click={()=>toolSettings.swapTool(toolReference)}></Button>
        <Shortcuts group='editor2D'>
          <Shortcut global cmd='clear selection' keys={['escape']} on:trigger={()=>$fileStates.focused?.push(new SelectionClearUndoable())} />
          <Shortcut global cmd='selection' keys={['s']} on:trigger={()=>toolSettings.swapTool(toolRectangularSelection)} />
          <Shortcut global cmd='magic selection' keys={['shift+s']} on:trigger={()=>toolSettings.swapTool(toolMagicWand)} />
          <Shortcut global cmd='move' keys={['m']} on:trigger={()=>toolSettings.swapTool(toolMove)} />
          <Shortcut global cmd='move left' keys={['arrowleft']} on:trigger={()=>toolMove.shift({file: $fileStates.focused}, {x: -1, y: 0, id: 0})} />
          <Shortcut global cmd='move right' keys={['arrowright']} on:trigger={()=>toolMove.shift({file: $fileStates.focused}, {x: 1, y: 0, id: 0})} />
          <Shortcut global cmd='move up' keys={['arrowup']} on:trigger={()=>toolMove.shift({file: $fileStates.focused}, {x: 0, y: -1, id: 0})} />
          <Shortcut global cmd='move down' keys={['arrowdown']} on:trigger={()=>toolMove.shift({file: $fileStates.focused}, {x: 0, y: 1, id: 0})} />
          <Shortcut global cmd='brush' keys={['b']} on:trigger={()=>toolSettings.swapTool(toolBrush)} />
          <Shortcut global cmd='brushToPicker' keys={['alt']} on:trigger={()=>($toolSettings.current===toolBrush||$toolSettings.current===toolSpray||$toolSettings.current===toolFill)?toolSettings.swapTool(toolPicker):null} on:release={()=>($toolSettings.previous===toolBrush||$toolSettings.previous===toolSpray||$toolSettings.previous===toolFill)&&$toolSettings.current===toolPicker?toolSettings.swapTool($toolSettings.previous):null} />
          <Shortcut global cmd='previousPrimaryPaletteEntry' keys={['alt+wheelup']} on:trigger={()=>stepPalette(-1, true)}/>
          <Shortcut global cmd='nextPrimaryPaletteEntry' keys={['alt+wheeldown']} on:trigger={()=>stepPalette(1, true)}/>
          <Shortcut global cmd='previousSecondaryPaletteEntry' keys={['alt+shift+wheelup']} on:trigger={()=>stepPalette(-1, false)}/>
          <Shortcut global cmd='nextSecondaryPaletteEntry' keys={['alt+shift+wheeldown']} on:trigger={()=>stepPalette(1, false)}/>
          <Shortcut global cmd='previousSlice' keys={['shift+wheelup']} on:trigger={()=>$fileStates.focused?.setSliceIndex($fileStates.focused?.sliceIndex-1)} />
          <Shortcut global cmd='nextSlice' keys={['shift+wheeldown']} on:trigger={()=>$fileStates.focused?.setSliceIndex($fileStates.focused?.sliceIndex+1)} />
          <Shortcut global cmd='fill' keys={['f']} on:trigger={()=>toolSettings.swapTool(toolFill)} />
          <Shortcut global cmd='picker' keys={['i']} on:trigger={()=>toolSettings.swapTool(toolPicker)} />
          <Shortcut global cmd='erase' keys={['e']} on:trigger={()=>toolSettings.swapTool(toolErase)} />
          <Shortcut global cmd='spray' keys={['p']} on:trigger={()=>toolSettings.swapTool(toolSpray)} />
          <Shortcut global cmd='copy' keys={['ctrl+c']} on:trigger={()=>engageCopy()} />
          <Shortcut global cmd='cut' keys={['ctrl+x']} on:trigger={()=>engageDelete(true)} />
          <Shortcut global cmd='delete' keys={['delete']} on:trigger={()=>engageDelete(false)} />
          <Shortcut global cmd='paste' keys={['ctrl+v']} on:trigger={()=>engagePaste()} />
          <Shortcut global cmd='quit' keys={['ctrl+q']} on:trigger={()=>engageQuit()} />
          <Shortcut global cmd='fullscreen' keys={['f11']} on:trigger={()=>ToggleFullscreen()} />
        </Shortcuts>
      {/if}
    </menu>
    <section class='middle'>
      <menu class='toolsettings'>
        {#if $toolSettings.current === toolBrush || $toolSettings.current === toolErase}
          <BrushSize bind:brushSize={$brushSettings.size} bind:brushType={$brushSettings.type}/>
          <NumberInput size="sm" min={1} max={100} step={1} bind:value={$brushSettings.size}/>
        {:else if $toolSettings.current === toolRectangle || $toolSettings.current === toolEllipse}
          fill:&nbsp; <Checkbox bind:checked={$brushSettings.fill}/>
        {:else if $toolSettings.current === toolSpray}
          radius:&nbsp; <NumberInput size="sm" min={1} max={100} step={1} bind:value={$brushSettings.sprayRadius}/>
          density:&nbsp; <NumberInput size="sm" min={1} max={100} step={1} bind:value={$brushSettings.sprayDensity}/>
        {:else if $toolSettings.current === toolReference && $fileStates.focused}
          <ImageReferenceTool file={$fileStates.focused} imageReferences={$editor2DSettings.imageReferences} />
        {/if}
      </menu>
      <Tabs bind:selected={$fileStates.focusedIndex}>
        {#each $fileStates.files as file, index}
          <Tab on:click={()=>selectFile(file, index, file.id)} title={file.filepath}>
            <TabTitle file={file} on:close={()=>closeFile(index)}/>
          </Tab>
        {/each}
        <svelte:fragment slot="content">
          {#each $fileStates.files as file, index}
            <TabContent>
              <Split bind:rightFocused={is3D} hideLeft={$editor2DSettings.editorMode !== '2d' && $editor2DSettings.editorMode !== 'both'} hideRight={$editor2DSettings.editorMode !== '3d' && $editor2DSettings.editorMode !== 'both'}>
                <svelte:fragment slot="left">
                  {#if !is3D}
                    <Shortcuts group='editor2D' active={$fileStates.focused===file}>
                      <Shortcut cmd='save' keys={['ctrl+s']} on:trigger={engageSave} />
                      <Shortcut cmd='saveAs' keys={['ctrl+shift+s']} on:trigger={engageSaveAs} />
                      <Shortcut cmd='undo' keys={['ctrl+z']} on:trigger={()=>file.undo()} />
                      <Shortcut cmd='redo' keys={['ctrl+y', 'ctrl+shift+z']} on:trigger={()=>file.redo()} />
                      <Shortcut global cmd={'swapFile'+index} keys={['F'+(index+1)]} on:trigger={()=>selectFile(file, index, file.id)} />
                    </Shortcuts>
                  {/if}
                  <Editor2D
                    bind:file={file}
                  />
                </svelte:fragment>
                <svelte:fragment slot="right">
                  {#if is3D}
                    <Shortcuts group='editor3D' active={$fileStates.focused===file}>
                      <Shortcut cmd='save' keys={['ctrl+s']} on:trigger={engageSave} />
                      <Shortcut cmd='saveAs' keys={['ctrl+shift+s']} on:trigger={engageSaveAs} />
                      <Shortcut cmd='undo' keys={['ctrl+z']} on:trigger={()=>file.undo()} />
                      <Shortcut cmd='redo' keys={['ctrl+y', 'ctrl+shift+z']} on:trigger={()=>file.redo()} />
                      <Shortcut global cmd={'swapFile'+index} keys={['F'+(index+1)]} on:trigger={()=>selectFile(file, index, file.id)} />
                    </Shortcuts>
                  {/if}
                  <Editor3D
                    bind:file={file}
                    bind:palette={fakePalette}
                    orthographic={orthographicCamera}
                  />
                </svelte:fragment>
              </Split>
            </TabContent>
          {/each}
        </svelte:fragment>
      </Tabs>
    </section>
    <section class='right'>
      {#if $fileStates.focused}
        <Frames file={$fileStates.focused} />
        <Stacks file={$fileStates.focused} />
      {/if}
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
          shronked={previewUseMini}
        />
      </FloatingPanel>
    {/if}
    {#if showPreviewSettings}
      <PreviewSettingsModal
        bind:open={showPreviewSettings}
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

{#if showNew}
  <ComposedModal bind:open={showNew} size="sm" preventCloseOnClickOutside on:click:button--primary={engageNew}>
    <New
      bind:open={showNew}
      bind:canvas={importCanvas}
      bind:png={importPNG}
    />
  </ComposedModal>
{/if}

{#if showColorMode && $fileStates.focused}
  <ComposedModal bind:open={showColorMode} size="sm" preventCloseOnClickOutside on:click:button--primary={engageColorMode}>
    <ColorMode
      bind:open={showColorMode}
      bind:file={$fileStates.focused}
      bind:indexed={newColorMode}
    />
  </ComposedModal>
{/if}
{#if showUpdater && $fileStates.focused}
  <VioUpdater bind:open={showUpdater} file={$fileStates.focused} />
{/if}

<ComposedModal bind:open={showAbout} size="sm" preventCloseOnClickOutside on:click:button--primary={engageNew}>
  <About bind:open={showAbout} />
</ComposedModal>

{#if useRichPresence}
  <RichPresence is3D={is3D}/>
{/if}

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
    grid-template-rows: minmax(0, 1fr);
    grid-template-columns: auto auto;
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
  :global(.bx--number input[type=number]) {
    padding-right: 1rem !important;
  }
  hr {
    width: 50%;
    height: 1px;
    border: none;
    background-color: var(--cds-text-02, #c6c6c6);
    margin: 0.5rem 0;
  }
</style>
