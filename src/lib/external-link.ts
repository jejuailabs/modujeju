/** VisitJeju content is shown inside the app; readers are not sent to visitjeju.net. */
export function isVisitJejuUrl(value: string | undefined | null): boolean {
  if (!value) return false;
  try {
    const host = new URL(value).hostname;
    return host === "visitjeju.net" || host.endsWith(".visitjeju.net");
  } catch {
    return false;
  }
}

/** A link worth showing: absolute https URL that does not point at VisitJeju. */
export function visibleSourceLink(value: string | undefined | null): string | null {
  if (!value || isVisitJejuUrl(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}
