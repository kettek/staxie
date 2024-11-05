<script lang="ts">
  import Input from '../common/Input.svelte'
  import { editor2DSettings, editor2DSettingsDefault } from '../../stores/editor2d'
  import { Column, Grid, Row } from 'carbon-components-svelte'
  import SettingsInput from '../common/SettingsInput.svelte'
</script>

<Grid narrow condensed fullWidth>
  <Column>
    <Row>
      <Input type="color" labelWidth="10" label="Background Color" bind:value={$editor2DSettings.backgroundColor} defaultValue={editor2DSettingsDefault.backgroundColor} />
      <SettingsInput type="text" bind:value={$editor2DSettings.backgroundColor} width={7} defaultValue={editor2DSettingsDefault.backgroundColor} />
    </Row>
  </Column>
</Grid>
