<script lang="ts">
  import { Column, Grid, Row } from 'carbon-components-svelte'
  import { autosaveSettings, autosaveSettingsDefault } from '../../stores/autosave'
  import Input from '../common/Input.svelte'
  import SettingsInput from '../common/SettingsInput.svelte'
</script>

<Grid narrow condensed fullWidth>
  <Column>
    <Row>
      <Input noPadding labelWidth="10" id="enableAutosave" type="checkbox" label="Autosave Enabled" bind:checked={$autosaveSettings.enabled} />
    </Row>
    <Row>
      <Input noPadding labelWidth="10" id="autosaveTemp" type="checkbox" label="Autosave to Temp" bind:checked={$autosaveSettings.saveToTemporary} />
    </Row>
    <Row>
      <Input disabled={!$autosaveSettings.saveToTemporary} noPadding labelWidth="10" id="autosaveTemp" type="checkbox" label="Autosave to Temp Directory" bind:checked={$autosaveSettings.saveToTempDir} />
    </Row>
    <Row>
      <SettingsInput noPadding labelWidth="10" id="autosaveInterval" type="number" label="Interval (seconds)" bind:value={$autosaveSettings.interval} step={1} defaultValue={autosaveSettingsDefault.interval} />
    </Row>
  </Column>
</Grid>
