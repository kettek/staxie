<script lang="ts">
  import { autosaveSettings } from '../stores/autosave'
  import { fileStates } from '../stores/file'
  import { createEventDispatcher, onMount } from 'svelte'

  const dispatch = createEventDispatcher()

  onMount(() => {
    let saveTimeout: NodeJS.Timeout | null = null
    saveTimeout = setTimeout(() => {
      const autosave = () => {
        if (!$fileStates.focused) return
        if (!$fileStates.focused.saved() && $fileStates.focused.filepath !== '') {
          if ($autosaveSettings.saveToTemporary) {
            dispatch('autosaveTemp', $fileStates.focused)
          } else {
            dispatch('autosave', $fileStates.focused)
          }
          saveTimeout = setTimeout(autosave, $autosaveSettings.interval * 1000)
        }
      }
      autosave()
    }, $autosaveSettings.interval * 1000)
    return () => {
      if (saveTimeout) clearTimeout(saveTimeout)
    }
  })
</script>
