import { writable, type Invalidator, type Subscriber, type Unsubscriber, type Updater } from 'svelte/store'
import { BrushTool, EraserTool, FillTool, MagicWandTool, MoveTool, PickerTool, PlaceVoxelTool, ReplaceVoxelTool, SelectionTool, SprayTool, type Tool } from '../types/tools'

type ToolSettings = {
  current: Tool
  previous: Tool
}

export const toolSelection = new SelectionTool()
export const toolMagicWand = new MagicWandTool()
export const toolFill = new FillTool()
export const toolErase = new EraserTool()
export const toolBrush = new BrushTool()
export const toolSpray = new SprayTool()
export const toolPicker = new PickerTool()
export const toolMove = new MoveTool()
export const toolVoxelPlace = new PlaceVoxelTool()
export const toolVoxelReplace = new ReplaceVoxelTool()

interface ToolSettingsStore {
  subscribe: (this: void, run: Subscriber<ToolSettings>, invalidate?: Invalidator<ToolSettings> | undefined) => Unsubscriber
  set: (this: void, value: ToolSettings) => void
  update: (this: void, updater: Updater<ToolSettings>) => void
  swapTool: (tool: Tool) => void
}

function createToolSettingsStore(): ToolSettingsStore {
  const { subscribe, set, update } = writable<ToolSettings>({
    current: toolBrush,
    previous: toolBrush,
  })

  return {
    subscribe,
    set,
    update,
    swapTool: (tool: Tool) => update((state) => {
      state.previous = state.current
      state.current = tool
      return state
    }),
  }
}

export const toolSettings = createToolSettingsStore()