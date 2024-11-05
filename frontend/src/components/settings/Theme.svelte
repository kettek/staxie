<script lang="ts">
  import { Dropdown, Theme } from 'carbon-components-svelte'

  let theme: 'white' | 'g10' | 'g80' | 'g90' | 'g100' = 'g90'
</script>

<Theme bind:theme />
<Dropdown
  titleText="Theme"
  bind:selectedId={theme}
  items={[
    { id: 'white', text: 'White' },
    { id: 'g10', text: 'Gray 10' },
    { id: 'g80', text: 'Gray 80' },
    { id: 'g90', text: 'Gray 90 (default)' },
    { id: 'g100', text: 'Gray 100' },
  ]}
/>
