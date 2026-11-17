export const mutedColorCandidates = [
  '#c87767', '#bf9754', '#5c87a8', '#5b9682', '#9479ab', '#b46d8b', '#5c9ca6', '#9b9d59',
  '#b56b54', '#c58d72', '#d0a17d', '#b6a16e', '#ad8d42', '#89935d', '#6e8d68', '#83a18c',
  '#4f8582', '#6f9aa6', '#738ba3', '#747d9e', '#8e7d9b', '#a184a5', '#a66f77', '#bb8a90',
];

export const defaultStyle = {
  pixels: mutedColorCandidates.slice(0, 8), colorCandidates: mutedColorCandidates,
  seed: 0, maxSize: 6, colorMode: 'auto', accentShare: .45,
};

const theme = (name, pixels, colorCandidates = pixels) => ({ name, pixels, colorCandidates });

/**
 * Named color themes by mood. Spread one over a style: { ...defaultStyle, ...themes.warm }.
 * Each sets colorCandidates too, so it replaces defaultStyle's candidates; colorCount picks fewer per text.
 */
export const themes = {
  muted: theme('Muted', defaultStyle.pixels, mutedColorCandidates),
  warm: theme('Warm', ['#c97b5a', '#d99a6c', '#e3b98a', '#b8654f', '#d4a373', '#e8c9a7', '#a8705a', '#cf8f80']),
  fresh: theme('Fresh', ['#8fd3c1', '#a6dcef', '#f2e394', '#b5e48c', '#79c2d0', '#c7f0db', '#f6c89f', '#9bd0a8']),
  dawn: theme('Dawn', ['#c3b1e1', '#f3c4b5', '#a9c4e8', '#e8b4c8', '#d7c6ea', '#f6dcc7', '#b8cde6', '#dba8b8']),
  dusk: theme('Dusk', ['#e07a5f', '#f2a65a', '#c06c84', '#6c5b7b', '#f8b195', '#d9837f', '#355c7d', '#e9c46a']),
  night: theme('Night', ['#1f2a44', '#2e3b5e', '#3d4f7a', '#5a6b8c', '#2b4a5a', '#8a7fb3', '#c9b37e', '#46607a']),
  cozy: theme('Cozy', ['#d8c3a5', '#a68a64', '#e6d5b8', '#8c6e54', '#c9ad8a', '#f0e3cc', '#b89b7a', '#7a5c47']),
  playful: theme('Playful', ['#f4a6a6', '#ffd38c', '#9ad0ec', '#b5e6a5', '#d4a5e8', '#ffc4a3', '#8fd3c7', '#f7d6e0']),
};
