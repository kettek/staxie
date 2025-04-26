<script lang="ts">
  import { fileStates } from '../stores/file'
  import { createEventDispatcher, onMount } from 'svelte'

  const dispatch = createEventDispatcher()

  onMount(() => {
    let saveTimeout: NodeJS.Timeout | null = null
    saveTimeout = setTimeout(() => {
      const autosave = () => {
        if (!$fileStates.focused) return
        if (!$fileStates.focused.saved() && $fileStates.focused.filepath !== '') {
          dispatch('autosave', $fileStates.focused)
          saveTimeout = setTimeout(autosave, 30000)
        }
      }
      autosave()
    }, 30000)
    return () => {
      if (saveTimeout) clearTimeout(saveTimeout)
    }
  })
</script>
