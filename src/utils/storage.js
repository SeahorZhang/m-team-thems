export function loadBoolean(key, defaultValue = true) {
  const v = localStorage.getItem(key);
  if (v === null || v === undefined) return Boolean(defaultValue);
  return v !== "false";
}

export function saveBoolean(key, enabled) {
  try {
    localStorage.setItem(key, enabled ? "true" : "false");
  } catch (e) {
    // ignore storage errors
  }
}
