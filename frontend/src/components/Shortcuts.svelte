<script context='module' lang='ts'>
  import { setContext, onDestroy } from 'svelte'
  import { get, writable } from 'svelte/store'
  export const SHORTCUTS = {}
  export type ShortcutsType = {
    registerShortcut: (opts: {cmd: string, group: string, keys: string[], callback: () => void}) => void,
  }
  
  let currentShortcuts = writable({id: {}, group: 'default'})
  
  type Shortcut = {
    id: {},
    cmd: string,
    keys: string[],
    callback: () => void,
    group: string,
  }
  
  let keys: Set<string> = new Set()
  let keystring = ''
  
  const modifiers = ['control', 'command', 'option', 'shift', 'alt', 'altgr', 'super', 'meta']
  
  function normalizeKey(event: KeyboardEvent): string {
    let key = event.key
    // Chrome bug lol
    if (event.key === 'Meta' && event.code.startsWith('Alt')) {
      key = 'Alt'
    }
    return key.toLowerCase()
  }
  
  function keysToString(keys: string[]): string {
    return [...keys].sort((a: string, b: string) => modifiers.indexOf(b) - modifiers.indexOf(a)).join('+')
  }
  
  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Alt') event.preventDefault() // Prevent alt because that opens a menu that doesn't exist.
    let key = normalizeKey(event)
    keys.add(key.toLowerCase())
    keystring = keysToString([...keys])
    
    let cur = get(currentShortcuts)
    for (let shortcut of get(shortcuts)) {
      if (shortcut.group !== cur.group) continue
      if (shortcut.id !== cur.id) continue
      if (shortcut.keys.includes(keystring)) {
        shortcut.callback()
      }
    }
  })
  window.addEventListener('keyup', (event: KeyboardEvent) => {
    let key = normalizeKey(event)
    keys.delete(key.toLowerCase())
    keystring = keysToString([...keys])
  })
  window.addEventListener('blur', () => {
    keys.clear()
    keystring = ''
  })

  const shortcuts = writable([] as Shortcut[])

</script>

<script lang='ts'>
  const id = {}
  export let group: string = 'default'
  export let active: boolean = true
  
  $: ((id, group, active) => {
    currentShortcuts.update(currentShortcuts => {
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
    registerShortcut: (opts: {cmd: string, keys: string[], callback: () => void}) => {
      shortcuts.update(shortcuts => {
        let keys = opts.keys.map(v => {
          return v.replaceAll('ctrl', 'control')
        })
        shortcuts.push({id, cmd: opts.cmd, group: group, keys: keys.map(v=>keysToString(v.split('+'))), callback: opts.callback})
        return shortcuts
      })
      
      onDestroy(() => {
        shortcuts.update(shortcuts => {
          return shortcuts.filter(shortcut => shortcut.id !== id)
        })
      })
    },
  })
</script>

<slot></slot>