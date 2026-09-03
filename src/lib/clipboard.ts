/**
 * navigator.clipboard.writeText() rejette (NotAllowedError) sans permission — navigation
 * privée, contexte non sécurisé, ou simplement refusée. On retombe sur un textarea temporaire +
 * execCommand plutôt que de laisser une promesse non gérée planter la console.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }
}
