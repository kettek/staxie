<script context="module" lang="ts">
  import { handlers } from './ShortcutHandlers.svelte'
  import { setContext, onDestroy } from 'svelte'
  import { get, writable } from 'svelte/store'
  import { fileStates } from '../stores/file'

  export const SHORTCUTS = {}
  export type ShortcutsType = {
    registerShortcut: (opts: { cmd: string; group: string; global: boolean; keys: string[]; trigger: () => void; release: () => void }) => void
  }

  let currentShortcuts = writable({ id: {}, group: 'default' })

  type Shortcut = {
    id: {}
    cmd: string
    keys: string[]
    global: boolean
    trigger: () => void
    release: () => void
    group: string
  }

  let triggered: Set<string> = new Set()
  let keys: Set<string> = new Set()
  let keystring = ''

  const modifiers = ['control', 'command', 'option', 'shift', 'alt', 'altgr', 'super', 'meta']

  let disabled: boolean = false
  export function disableShortcuts() {
    disabled = true
  }
  export function enableShortcuts() {
    disabled = false
  }
  export function isKeyActive(key: string): boolean {
    return keys.has(key)
  }

  export function triggerCommand(group: string, cmd: string, fileId?: number) {
    let cmds = new Set()
    let cur = get(currentShortcuts)
    for (let shortcut of get(shortcuts)) {
      if (shortcut.group !== group) continue
      if (!shortcut.global && shortcut.id !== cur.id) continue
      if (shortcut.cmd === cmd) {
        cmds.add(shortcut.cmd)
        shortcut.trigger()
      }
    }

    for (let cmd of cmds) {
      for (let handler of get(handlers)) {
        if (handler.fileId !== undefined && handler.fileId !== (fileId ?? get(fileStates).focused?.id)) continue
        if (handler.group === group && handler.cmd === cmd) {
          handler.trigger()
        }
      }
    }
  }

  function normalizeKey(key: string, code: string): string {
    // Chrome bug lol
    if (key === 'Meta' && code.startsWith('Alt')) {
      key = 'Alt'
    }
    return key.toLowerCase()
  }

  function keysToString(keys: string[]): string {
    return [...keys].sort((a: string, b: string) => modifiers.indexOf(b) - modifiers.indexOf(a)).join('+')
  }

  export function getShortcutKeys(group: string, cmd: string): string[][] {
    let keys: string[][] = []
    for (let shortcut of get(shortcuts)) {
      if (shortcut.group === group && shortcut.cmd === cmd) {
        if (keys.includes(shortcut.keys)) continue
        keys.push(shortcut.keys.map((v) => v.replace('control', '⌃').replace('shift', '⇧').replace('alt', '⌥').replace('+', '')))
      }
    }
    return keys
  }

  function addKeydown(key: string) {
    keys.add(key.toLowerCase())
    keystring = keysToString([...keys])

    let cmds = new Set()
    let cur = get(currentShortcuts)
    for (let shortcut of get(shortcuts)) {
      if (shortcut.group !== cur.group) continue
      if (!shortcut.global && shortcut.id !== cur.id) continue
      if (shortcut.keys.includes(keystring)) {
        cmds.add(shortcut.cmd)
        triggered.add(keystring)
        shortcut.trigger()
      }
    }

    for (let cmd of cmds) {
      for (let handler of get(handlers)) {
        if (handler.fileId !== undefined && handler.fileId !== get(fileStates).focused?.id) continue
        if (handler.group === cur.group && handler.cmd === cmd) {
          handler.trigger()
        }
      }
    }
  }
  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
    // On windows, previously focused input fields are refocused if ctrl-z or ctrl-y is used, so we have to catch those conditions to prevent the input field from receiving the undo/redo operation.
    if (event.target === document.body && (event.ctrlKey || (event.ctrlKey && event.shiftKey)) && (event.key === 'z' || event.key === 'y')) {
      event.preventDefault()
    }
    if (disabled) return
    if (event.key === 'Alt') event.preventDefault() // Prevent alt because that opens a menu that doesn't exist.
    let key = normalizeKey(event.key, event.code)
    addKeydown(key)
  })
  function addKeyup(key: string) {
    keystring = keysToString([...keys])

    let cur = get(currentShortcuts)
    if (triggered.has(keystring)) {
      triggered.delete(keystring)
      let cmds = new Set()
      for (let shortcut of get(shortcuts)) {
        if (shortcut.group !== cur.group) continue
        if (!shortcut.global && shortcut.id !== cur.id) continue
        if (shortcut.keys.includes(keystring)) {
          shortcut.release()
          cmds.add(shortcut.cmd)
        }
      }

      for (let cmd of cmds) {
        for (let handler of get(handlers)) {
          if (handler.fileId !== undefined && handler.fileId !== get(fileStates).focused?.id) continue
          if (handler.group === cur.group && handler.cmd === cmd) {
            handler.release()
          }
        }
      }
    }

    keys.delete(key.toLowerCase())
    keystring = keysToString([...keys])
  }
  window.addEventListener('keyup', (event: KeyboardEvent) => {
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
    if (disabled) return

    const key = normalizeKey(event.key, event.code)
    addKeyup(key)
  })

  window.addEventListener('wheel', (event: WheelEvent) => {
    if (disabled) return
    if (event.deltaY < 0 || event.deltaX < 0) {
      keys.add('wheelup')
    } else if (event.deltaY > 0 || event.deltaX > 0) {
      keys.add('wheeldown')
    }

    keystring = keysToString([...keys])

    let cmds = new Set()
    let cur = get(currentShortcuts)
    for (let shortcut of get(shortcuts)) {
      if (shortcut.group !== cur.group) continue
      if (!shortcut.global && shortcut.id !== cur.id) continue
      if (shortcut.keys.includes(keystring)) {
        cmds.add(shortcut.cmd)
        shortcut.trigger()
      }
    }

    for (let cmd of cmds) {
      for (let handler of get(handlers)) {
        if (handler.fileId !== undefined && handler.fileId !== get(fileStates).focused?.id) continue
        if (handler.group === cur.group && handler.cmd === cmd) {
          handler.trigger()
        }
      }
    }

    keys.delete('wheelup')
    keys.delete('wheeldown')
  })

  window.addEventListener('blur', () => {
    for (let key of keys) {
      addKeyup(key)
    }
    keys.clear()
    keystring = ''
  })

  const shortcuts = writable([] as Shortcut[])
</script>

<script lang="ts">
  const id = {}
  export let group: string = 'default'
  export let active: boolean = true

  $: ((id, group, active) => {
    currentShortcuts.update((currentShortcuts) => {
      if (active) {
        if (currentShortcuts.id === id) {
          currentShortcuts.group = group
        } else {
          currentShortcuts.id = id
          currentShortcuts.group = group
        }
      } else if (currentShortcuts.id === id) {
        currentShortcuts.id = {}
        currentShortcuts.group = 'default'
      }
      return currentShortcuts
    })
  })(id, group, active)

  setContext(SHORTCUTS, {
    registerShortcut: (opts: { cmd: string; keys: string[]; global: boolean; trigger: () => void; release: () => void }) => {
      shortcuts.update((shortcuts) => {
        let keys = opts.keys.map((v) => {
          return v.replaceAll('ctrl', 'control')
        })
        shortcuts.push({ id, cmd: opts.cmd, group: group, global: opts.global, keys: keys.map((v) => keysToString(v.toLowerCase().split('+'))), trigger: opts.trigger, release: opts.release })
        return shortcuts
      })

      onDestroy(() => {
        shortcuts.update((shortcuts) => {
          return shortcuts.filter((shortcut) => shortcut.id !== id)
        })
      })
    },
  })
</script>

<slot></slot>
