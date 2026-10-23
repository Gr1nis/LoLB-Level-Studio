/**
 * LoLB Level Studio - Main Application Entry Point
 * Orchestrates studio initialization, data loading, AI Bridge, and initial workspace rendering.
 */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Load all levels and catalogs from server
    if (typeof window.loadAllData === 'function') {
      await window.loadAllData();
    }

    // 2. Initialize SSE connection, status pill, and hotkeys
    if (typeof window.initAiBridge === 'function') {
      window.initAiBridge();
    }

    // 3. Ensure primary mode is 'post' and render active workspace
    if (typeof window.switchMode === 'function') {
      window.switchMode('post');
    } else if (typeof window.renderActiveWorkspace === 'function') {
      window.renderActiveWorkspace();
    }
  } catch (err) {
    console.error('Failed to initialize LoLB Level Studio:', err);
  }
});
