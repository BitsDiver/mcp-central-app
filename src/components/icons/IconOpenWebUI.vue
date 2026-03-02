<template>
  <!-- Open WebUI: globe with longitude/latitude lines — "open web" suggestion -->
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke-width="1.75" />
    <!-- vertical meridian -->
    <path d="M12 3c-2.5 3-2.5 15 0 18M12 3c2.5 3 2.5 15 0 18" stroke-width="1.5" />
    <!-- horizontal parallels -->
    <path d="M3 12h18M4.2 7.5c2.3.9 5.1 1.4 7.8 1.4s5.5-.5 7.8-1.4M4.2 16.5c2.3-.9 5.1-1.4 7.8-1.4s5.5.5 7.8 1.4" stroke-width="1.5" />
  </svg>
</template>
