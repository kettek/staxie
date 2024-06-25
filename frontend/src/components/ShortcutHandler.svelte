<script lang='ts'>
  import { createEventDispatcher } from "svelte"
  import { getContext } from "svelte"
  import { HANDLERS, type HandlersType } from "./ShortcutHandlers.svelte"
  
  const dispatch = createEventDispatcher()
  
  export let group: string = 'default'
  export let cmd: string
  export let fileId: number
  const { registerHandler } = getContext(HANDLERS) as HandlersType
  
  registerHandler({cmd, group, fileId, trigger: () => {
    dispatch('trigger', {})
  }, release: () => {
    dispatch('release', {})
  }})
</script>