import { get, writable, type Invalidator, type Subscriber, type Unsubscriber, type Updater } from 'svelte/store'
import { BrushTool, EraserTool, FillTool, MagicWandTool, MoveTool, EllipseTool, PickerTool, PlaceVoxelTool, RectangleTool, ReplaceVoxelTool, SelectionRectangularTool, SelectionEllipseTool, SprayTool, type Tool, SelectBoxVoxelTool, CursorVoxelTool, ReferenceTool } from '../types/tools'

type ToolSettings = {
  current: Tool
  previous: Tool
}

export const toolRectangularSelection = new SelectionRectangularTool()
export const toolEllipseSelection = new SelectionEllipseTool()
export const toolMagicWand = new MagicWandTool()
export const toolFill = new FillTool()
export const toolErase = new EraserTool()
export const toolBrush = new BrushTool()
export const toolRectangle = new RectangleTool()
export const toolEllipse = new EllipseTool()
export const toolSpray = new SprayTool()
export const toolPicker = new PickerTool()
export const toolMove = new MoveTool()
export const toolReference = new ReferenceTool()
export const toolVoxelPlace = new PlaceVoxelTool()
export const toolVoxelReplace = new ReplaceVoxelTool()
export const toolVoxelCursor = new CursorVoxelTool()
export const toolVoxelBoxSelection = new SelectBoxVoxelTool()
export const toolCanvas = document.createElement('canvas') // Publicly useable canvas for tool operations.

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

  const storage: Record<string, { current: Tool; previous: Tool }> = {}

  return {
    subscribe,
    set,
    update,
    swapTool: (tool: Tool) =>
      update((state) => {
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
