export class UndoableStack<T> {
  private target: T;
  private stack: Undoable<T>[] = [];
  private stackIndex: number = 0;
  
  private captureStack: Undoable<T>[] = [];
  private capturing: boolean = false;

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
  }

  public redo() {
    if (this.stackIndex === this.stack.length) {
      return;
    }
    this.stack[this.stackIndex++].apply(this.target);
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
}

export interface Undoable<T> {
  apply(t: T): void;
  unapply(t: T): void;
}

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
