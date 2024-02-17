<script lang='ts'>
  import { createEventDispatcher } from "svelte"
  import { getContext } from "svelte"
  import { SHORTCUTS, type ShortcutsType } from "./Shortcuts.svelte"
  
  const dispatch = createEventDispatcher()
  
  export let group: string = 'default'
  export let cmd: string
  export let keys: string[]
  export let global: boolean = false
  const { registerShortcut } = getContext(SHORTCUTS) as ShortcutsType
  
  registerShortcut({cmd, group, global, keys, trigger: () => {
    dispatch('trigger', {})
  }, release: () => {
    dispatch('release', {})
  }})
  
</script>