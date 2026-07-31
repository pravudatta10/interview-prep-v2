/**
 * lazyLoad
 * Single responsibility: dynamic import() wrapper with a friendly error path.
 * Feature modules use this so the router only pulls in the code for the
 * screen the user is actually visiting.
 */
export async function lazyImport(importer) {
  try {
    return await importer();
  } catch (err) {
    console.error('Failed to lazy-load module', err);
    throw err;
  }
}
