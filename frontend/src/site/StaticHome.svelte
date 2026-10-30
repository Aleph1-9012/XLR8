<script lang="ts">
  import type { Summary } from '../catalog/contracts';
  import Home from './Home.svelte';
  import Footer from './Footer.svelte';

  let { widgets }: { widgets: readonly Summary[] } = $props();
</script>

<div id="top">
  <main id="main" tabindex="-1"><Home {widgets} /></main>
  <Footer />
</div>
