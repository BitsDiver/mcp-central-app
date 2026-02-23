import { ref, watch, onMounted } from 'vue'

const isDark = ref(false)

export function useDarkMode() {
  function apply(dark: boolean): void {
    if (dark) {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    isDark.value = dark
  }

  function toggle(): void {
    const next = !isDark.value
    localStorage.setItem('mcp-theme', next ? 'dark' : 'light')
    apply(next)
  }

  onMounted(() => {
    const stored = localStorage.getItem('mcp-theme')
    if (stored) {
      apply(stored === 'dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      apply(prefersDark)
    }
  })

  watch(isDark, (val) => {
    if (val) {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  })

  return { isDark, toggle }
}
