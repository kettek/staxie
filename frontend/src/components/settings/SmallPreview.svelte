<script lang="ts">
  import { Column, Grid, Row } from 'carbon-components-svelte'
  import { smallPreviewSettings, smallPreviewSettingsDefault } from '../../stores/smallpreview'
  import Input from '../common/Input.svelte'
  import SettingsInput from '../common/SettingsInput.svelte'
</script>

<Grid narrow condensed fullWidth>
  <Column>
    <Row>
      <Input noPadding labelWidth="10" id="showSizeOutline" type="checkbox" label="Show" bind:checked={$smallPreviewSettings.show} />
    </Row>
    <Row>
      <Input noPadding labelWidth="10" id="background" type="color" label="Background Color" bind:value={$smallPreviewSettings.background} />
      <SettingsInput noPadding id="background" type="text" bind:value={$smallPreviewSettings.background} defaultValue={smallPreviewSettingsDefault.background} />
    </Row>
    <Row>
      <Input noPadding labelWidth="10" type="checkbox" label="Interpolate Slices" bind:checked={$smallPreviewSettings.interpolateSlices} />
    </Row>
    <Row>
      <SettingsInput noPadding labelWidth="10" id="spinSpeed" type="number" label="Spin Speed" bind:value={$smallPreviewSettings.spinSpeed} step={0.1} defaultValue={smallPreviewSettingsDefault.spinSpeed} />
    </Row>
    <Row>
      <SettingsInput noPadding labelWidth="10" id="wheelIncrement" type="number" label="Mousewheel Increment" bind:value={$smallPreviewSettings.wheelIncrement} defaultValue={smallPreviewSettingsDefault.wheelIncrement} />
    </Row>
  </Column>
</Grid>
