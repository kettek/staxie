// UndoableStack provides an undo/redo system.
export class UndoableStack<T> {
  private target: T
  public lastEntry: Undoable<T> | undefined = undefined
  protected entries: Undoable<T>[] = []
  protected entriesIndex: number = 0

  private captureStack: Undoable<T>[] = []
  private capturing: boolean = false

  private listeners: { [key: string]: ((...args: any[]) => void)[] } = {}

  setTarget(target: T) {
    this.target = target
  }

  public push(item: Undoable<T>) {
    if (this.capturing) {
      this.captureStack.push(item)
      item.apply(this.target)
      return
    }

    this.entries.splice(this.entriesIndex, this.entries.length - this.entriesIndex, item)
    item.apply(this.target)
    this.lastEntry = item
    this.entriesIndex++
    this.emit('push', item)
  }

  public pop(): Undoable<T> {
    if (this.entries.length === 0) {
      return null
    }
    this.entries[this.entries.length - 1].unapply(this.target)
    return this.entries.pop()
  }

  public undo() {
    if (this.entriesIndex === 0) {
      return
    }
    this.entries[--this.entriesIndex].unapply(this.target)
    this.emit('undo', this.entries[this.entriesIndex])
  }

  public redo() {
    if (this.entriesIndex === this.entries.length) {
      return
    }
    this.entries[this.entriesIndex++].apply(this.target)
    this.emit('redo', this.entries[this.entriesIndex - 1])
  }

  public canUndo() {
    return this.entriesIndex > 0
  }

  public canRedo() {
    return this.entriesIndex < this.entries.length
  }
  public capture() {
    this.captureStack = []
    this.capturing = true
  }
  public release() {
    this.capturing = false
    this.entries.splice(this.entriesIndex, this.entries.length - this.entriesIndex, new UndoableGroup(this.captureStack))
    this.lastEntry = this.entries[this.entriesIndex]
    this.entriesIndex++
    this.captureStack = []
  }

  public on(event: string, listener: (...args: any[]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(listener)
  }

  public off(event: string, listener: (...args: any[]) => void) {
    if (!this.listeners[event]) {
      return
    }
    let index = this.listeners[event].indexOf(listener)
    if (index === -1) {
      return
    }
    this.listeners[event].splice(index, 1)
  }

  public emit(event: string, ...args: any[]) {
    if (!this.listeners[event]) {
      return
    }
    for (let listener of this.listeners[event]) {
      listener(...args)
    }
  }
}

// Undoable is an interface for undoable actions stored in the entries.
export interface Undoable<T> {
  apply(t: T): void
  unapply(t: T): void
}

// UndoableGroup is a group of undoable actions. This is used to group multiple actions, such as drawing with a pen, into one undoable action.
export class UndoableGroup<T> {
  private items: Undoable<T>[]

  constructor(items: Undoable<T>[]) {
    this.items = items
  }

  getItems(): Undoable<T>[] {
    return this.items
  }

  add(item: Undoable<T>) {
    this.items.push(item)
  }

  apply(t: T) {
    for (let item of this.items) {
      item.apply(t)
    }
  }

  unapply(t: T) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      this.items[i].unapply(t)
    }
  }

  clone(): UndoableGroup<T> {
    return new UndoableGroup(
      this.items.map((item) => {
        let item2 = item as Undoable<T> & { clone: () => Undoable<T> }
        if (item2.clone) {
          return item2.clone()
        }
        return item
      }),
    )
  }
}
