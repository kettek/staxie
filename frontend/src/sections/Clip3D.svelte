<script lang="ts">
  import { Checkbox } from 'carbon-components-svelte'
  import { editor3DSettings } from '../stores/editor3d'
  import Input from '../components/common/Input.svelte'
</script>

<main>
  <Checkbox labelText="Clip View" bind:checked={$editor3DSettings.useClipping}></Checkbox>
  <Input labelWidth="3" label="X" type="number" size="small" width={4} showSpinner bind:value={$editor3DSettings.clipX} />
  <Input labelWidth="3" label="Y" type="number" size="small" width={4} showSpinner bind:value={$editor3DSettings.clipY} />
  <Input labelWidth="3" label="Z" type="number" size="small" width={4} showSpinner bind:value={$editor3DSettings.clipZ} />
  <hr />
  <Input labelWidth="3" label="W" type="number" size="small" width={4} showSpinner bind:value={$editor3DSettings.clipW} />
  <Input labelWidth="3" label="H" type="number" size="small" width={4} showSpinner bind:value={$editor3DSettings.clipH} />
  <Input labelWidth="3" label="D" type="number" size="small" width={4} showSpinner bind:value={$editor3DSettings.clipD} />
</main>
