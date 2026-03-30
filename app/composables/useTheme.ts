import { ref, onMounted, watch } from 'vue';

export type ThemeMode = 'dark' | 'light';

const currentTheme = ref<ThemeMode>('dark');
let _initialized = false;

/**
 * Composable to manage app-wide theme (dark / light).
 * Persists preference in localStorage and applies `data-theme` attribute
 * to `<html>` element for CSS variable overrides.
 */
export function useTheme() {

  function applyTheme(theme: ThemeMode) {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  function setTheme(theme: ThemeMode) {
    currentTheme.value = theme;
    applyTheme(theme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dart-theme', theme);
    }
  }

  function toggleTheme() {
    setTheme(currentTheme.value === 'dark' ? 'light' : 'dark');
  }

  // Initialize once
  if (!_initialized && typeof window !== 'undefined') {
    _initialized = true;
    const stored = localStorage.getItem('dart-theme') as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') {
      currentTheme.value = stored;
    } else {
      // Respect OS preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      currentTheme.value = prefersDark ? 'dark' : 'light';
    }
    applyTheme(currentTheme.value);
  }

  // SSR-safe: also apply on mount in case the initialization hadn't run yet
  onMounted(() => {
    applyTheme(currentTheme.value);
  });

  const isDark = ref(true);

  watch(currentTheme, (v) => {
    isDark.value = v === 'dark';
  }, { immediate: true });

  return {
    currentTheme,
    isDark,
    setTheme,
    toggleTheme,
  };
}
