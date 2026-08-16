// Saved stories live entirely in the browser's localStorage, keyed by the
// story's Supabase id. There's no auth yet, so this is per-device only: a
// save made on one browser/phone doesn't show up anywhere else. Denormalized
// display fields (headline/url/source/digest_date) are stored alongside the
// id rather than just the id, because the client has no route to re-fetch a
// single entry by id from Supabase — /saved reads purely from what's here.

const STORAGE_KEY = "sift:saved-stories";
// Fired on the same tab after any write, since the native "storage" event
// only reaches *other* tabs — components in this tab need their own signal
// to notice a save/remove happened.
const CHANGED_EVENT = "sift:saved-stories-changed";

function readAll() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(map) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

function isStorySaved(id) {
  return Boolean(readAll()[id]);
}

function saveStory({ id, headline, url, source, digest_date }) {
  const all = readAll();
  all[id] = { id, headline, url, source, digest_date, savedAt: Date.now() };
  writeAll(all);
}

function removeStory(id) {
  const all = readAll();
  delete all[id];
  writeAll(all);
}

// Newest saved first, per the /saved page spec.
function getAllSaved() {
  return Object.values(readAll()).sort((a, b) => b.savedAt - a.savedAt);
}

export { CHANGED_EVENT, isStorySaved, saveStory, removeStory, getAllSaved };
