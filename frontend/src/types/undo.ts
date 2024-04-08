// UndoableStack provides an undo/redo system.
export class UndoableStack<T> {
  private target: T;
  private stack: Undoable<T>[] = [];
  private stackIndex: number = 0;
  
  private captureStack: Undoable<T>[] = [];
  private capturing: boolean = false;

  private listeners: { [key: string]: ((...args: any[]) => void)[] } = {}

  setTarget(target: T) {
    this.target = target;
  }

  public push(item: Undoable<T>) {
    if (this.capturing) {
      this.captureStack.push(item);
      item.apply(this.target);
      return;
    }

    this.stack.splice(this.stackIndex, this.stack.length - this.stackIndex, item);
    item.apply(this.target);
    this.stackIndex++;
    this.emit('push', item)
  }

  public pop(): Undoable<T> {
    if (this.stack.length === 0) {
      return null;
    }
    this.stack[this.stack.length - 1].unapply(this.target);
    return this.stack.pop();
  }
  
  public undo() {
    if (this.stackIndex === 0) {
      return;
    }
    this.stack[--this.stackIndex].unapply(this.target);
    this.emit('undo', this.stack[this.stackIndex])
  }

  public redo() {
    if (this.stackIndex === this.stack.length) {
      return;
    }
    this.stack[this.stackIndex++].apply(this.target);
    this.emit('redo', this.stack[this.stackIndex - 1])
  }
  
  public canUndo() {
    return this.stackIndex > 0;
  }

  public canRedo() {
    return this.stackIndex < this.stack.length;
  }
  
  public capture() {
    this.captureStack = [];
    this.capturing = true;
  }
  public release() {
    this.capturing = false;
    this.stack.splice(this.stackIndex, this.stack.length - this.stackIndex, new UndoableGroup(this.captureStack));
    this.stackIndex++;
    console.log(this.stack, this.stackIndex)
    this.captureStack = [];
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

// Undoable is an interface for undoable actions stored in the stack.
export interface Undoable<T> {
  apply(t: T): void;
  unapply(t: T): void;
}

// UndoableGroup is a group of undoable actions. This is used to group multiple actions, such as drawing with a pen, into one undoable action.
export class UndoableGroup<T> {
  private items: Undoable<T>[];

  constructor(items: Undoable<T>[]) {
    this.items = items;
  }
  
  add(item: Undoable<T>) {
    this.items.push(item);
  }

  apply(t: T) {
    for (let item of this.items) {
      item.apply(t);
    }
  }

  unapply(t: T) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      this.items[i].unapply(t);
    }
  }
}
