import { get, writable, type Invalidator, type Subscriber, type Unsubscriber, type Updater } from 'svelte/store'
import { BrushTool, EraserTool, FillTool, MagicWandTool, MoveTool, OvalTool, PickerTool, PlaceVoxelTool, ReplaceVoxelTool, SelectionTool, SprayTool, SquareTool, type Tool } from '../types/tools'

type ToolSettings = {
  current: Tool
  previous: Tool
}

export const toolSelection = new SelectionTool()
export const toolMagicWand = new MagicWandTool()
export const toolFill = new FillTool()
export const toolErase = new EraserTool()
export const toolBrush = new BrushTool()
export const toolSquare = new SquareTool()
export const toolOval = new OvalTool()
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
  store: (set: string) => void
  restore: (set: string) => boolean
}

function createToolSettingsStore(): ToolSettingsStore {
  const { subscribe, set, update } = writable<ToolSettings>({
    current: toolBrush,
    previous: toolBrush,
  })
  
  const storage: Record<string, {current: Tool, previous: Tool}> = {}

  return {
    subscribe,
    set,
    update,
    swapTool: (tool: Tool) => update((state) => {
      state.previous = state.current
      state.current = tool
      return state
    }),
    store: (set: string) => {
      update((state) => {
        storage[set] = {
          current: state.current,
          previous: state.previous,
        }
        return state
      })
    },
    restore: (set: string) => {
      let has = false
      update((state) => {
        let pair = storage[set]
        if (pair) {
          has = true
          state.current = pair.current
          state.previous = pair.previous
        }
        return state
      })
      return has
    },
  }
}

export const toolSettings = createToolSettingsStore()