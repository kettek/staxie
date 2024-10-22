<!--
  @component

  This component provides an about modal.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { Version, Update, GetPlatform } from '../../wailsjs/go/main/App.js'
  import { BrowserOpenURL } from '../../wailsjs/runtime/runtime.js'

  import { ModalHeader, ModalBody, ModalFooter, Link } from 'carbon-components-svelte'
  import Button from '../components/common/Button.svelte'
  import { UpdateNow } from 'carbon-icons-svelte'

  export const open: boolean = false
  let version: string = ''
  let newer: boolean = false
  let availableVersion: string = ''
  let availableSHA: string = ''
  let downloadURL: string = ''

  function followLink(e: MouseEvent) {
    e.preventDefault()
    BrowserOpenURL((e.target as HTMLAnchorElement).href)
  }

  async function getRelativeTarget(asset: any[]) {
    let platform = await GetPlatform()
    if (platform.startsWith('windows')) {
      platform += '.exe'
    }
    for (const a of asset) {
      if (a.name === `Staxie-${platform}`) {
        return a.browser_download_url
      }
    }
    return ''
  }

  async function getRelease() {
    const url = 'https://api.github.com/repos/kettek/staxie/releases/latest'

    try {
      newer = false
      const results = await (await fetch(url)).json()
      const tag = await (await fetch(`https://api.github.com/repos/kettek/staxie/git/ref/tags/${results.tag_name}`)).json()
      const sha = (await (await fetch(`https://api.github.com/repos/kettek/staxie/git/tags/${tag.object.sha}`)).json())?.object?.sha
      const match = await getRelativeTarget(results.assets)
      downloadURL = match

      availableVersion = results.tag_name
      availableSHA = sha

      if (sha !== version) {
        newer = true
      } else {
        newer = false
      }
    } catch (e) {
      console.error(e)
    }
  }

  function update() {
    Update(downloadURL)
  }

  onMount(async () => {
    if ((window as any)['go']) {
      version = await Version()
      await getRelease()
    } else {
      version = 'unknown browser'
    }
  })
</script>

<ModalHeader label="Staxie" />
<ModalBody>
  <article>
    <p>Staxie is an open source, free software, and cross-platform sprite and sprite stack editor written with Wails in Svelte and Go.</p>
  </article>
  <article>
    <header>GitHub</header>
    <Link on:click={followLink} href="https://github.com/kettek/staxie">Repository</Link>
    <Link on:click={followLink} href="https://github.com/kettek/staxie/issues">Issues</Link>
  </article>
  <article>
    <header>Version</header>
    <span>{version}</span>
  </article>
  {#if availableVersion}
    <article>
      <header>Latest Version</header>
      <Link on:click={followLink} href="https://github.com/kettek/staxie/releases/tag/{availableVersion}">{availableVersion} ({availableSHA})</Link>
      {#if newer && downloadURL}
        <Button kind="ghost" size="small" icon={UpdateNow} tooltipPosition="bottom" tooltip="Update Now" on:click={update} />
      {/if}
    </article>
  {/if}
  <article>
    <header>Author</header>
    <Link on:click={followLink} href="https://kettek.net">kettek</Link>
  </article>
</ModalBody>

<style>
  article {
    display: flex;
    flex-direction: row;
    gap: 1rem;
    justify-content: flex-start;
    align-items: center;
    user-select: none;
    padding-bottom: 1em;
  }
  article span {
    user-select: text;
  }
  p {
    text-align: left;
  }
  header {
    font-weight: bold;
  }
</style>
