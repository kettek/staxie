<script lang="ts" type="module">
  import { onMount } from 'svelte'
  import { SetRichPresenceState, SetRichPresenceDetails, UpdateRichPresence, StartRichPresence, StopRichPresence, GetOSSeparator } from '../../wailsjs/go/main/App'
  import { fileStates } from '../stores/file'
  import { LoadedFile } from '../types/file'

  export let is3D: boolean
  let separator: string = '/'

  let lastFocusedFile: LoadedFile | null
  $: if (lastFocusedFile != $fileStates.focused) syncFile($fileStates.focused)
  $: is3D ? refresh() : refresh()

  async function syncFile(file: LoadedFile | null) {
    lastFocusedFile = file
    await refresh()
  }

  async function refresh() {
    if (lastFocusedFile) {
      await SetRichPresenceState(`Editing in ${is3D ? '3D' : '2D'}`)
      await SetRichPresenceDetails(lastFocusedFile.filepath ? lastFocusedFile.filepath.split(separator).pop() : 'something special')
    } else {
      await SetRichPresenceState('Idle')
      await SetRichPresenceDetails('No file open')
    }
    await UpdateRichPresence()
  }

  onMount(async () => {
    separator = (await GetOSSeparator()) as string
    await StartRichPresence()
    await SetRichPresenceState('Idle')
    await SetRichPresenceDetails('No file open')
    await UpdateRichPresence()
    return () => {
      StopRichPresence()
    }
  })
</script>
