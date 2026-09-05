export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
  return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  localStorage.setItem('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

export function initTheme(): void {
  applyTheme(getTheme());
}
