<!--
  @component
  
  This component provides a settings modal.
-->
<script lang="ts">
  import { Accordion, AccordionItem } from 'carbon-components-svelte'
  import Theme from '../components/settings/Theme.svelte'
  import Background from '../components/settings/Background.svelte'
  import Preview from '../components/settings/Preview.svelte'
  import Checkerboard from '../components/settings/Checkerboard.svelte'
  import Borders from '../components/settings/Borders.svelte'
  import Grid from '../components/settings/Grid.svelte'
</script>

<main>
  <Accordion align="start">
    <AccordionItem title="General">
      <Theme />
      <Background />
      <Grid />
    </AccordionItem>
    <AccordionItem title="2D View">
      <Checkerboard />
      <Borders />
    </AccordionItem>
    <AccordionItem title="Preview">
      <Preview />
    </AccordionItem>
  </Accordion>
</main>

<style>
  main {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    height: 100%;
  }
  :global(.bx--accordion__content) {
    padding-right: 3rem;
  }
</style>
