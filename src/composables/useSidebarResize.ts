import { ref } from "vue";

const STORAGE_KEY = "chat-sidebar-width";

/**
 * useSidebarResize — drag-to-resize sidebar with localStorage persistence.
 */
export function useSidebarResize() {
  const sidebarOpen = ref(true);
  const sidebarWidth = ref(
    parseInt(localStorage.getItem(STORAGE_KEY) ?? "240", 10),
  );
  const isResizing = ref(false);

  function startSidebarResize(e: MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth.value;
    isResizing.value = true;

    function onMove(ev: MouseEvent) {
      sidebarWidth.value = Math.max(
        160,
        Math.min(420, startWidth + ev.clientX - startX),
      );
      localStorage.setItem(STORAGE_KEY, String(sidebarWidth.value));
    }
    function onUp() {
      isResizing.value = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return { sidebarOpen, sidebarWidth, isResizing, startSidebarResize };
}
