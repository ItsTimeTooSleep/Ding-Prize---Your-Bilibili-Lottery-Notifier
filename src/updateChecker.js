/**
 * updateChecker.js
 * This module handles checking for new versions of the extension from GitHub releases.
 */

const GITHUB_RELEASES_API_URL = 'https://api.github.com/repos/ItsTimeTooSleep/Ding-Prize---Your-Bilibili-Lottery-Notifier/releases/latest';

/**
 * Fetches the latest release information from GitHub.
 * @returns {Promise<object|null>} A promise that resolves with the latest release data or null if an error occurs.
 */
async function fetchLatestRelease() {
    try {
        const response = await fetch(GITHUB_RELEASES_API_URL);
        if (!response.ok) {
            console.error(`[UpdateChecker] Failed to fetch latest release: ${response.statusText}`);
            return null;
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`[UpdateChecker] Error fetching latest release:`, error);
        return null;
    }
}

/**
 * Gets the current extension version from manifest.json.
 * @returns {string} The current version string.
 */
function getCurrentVersion() {
    return chrome.runtime.getManifest().version;
}

/**
 * Checks for updates and stores the result.
 * @returns {Promise<void>}
 */
async function checkForUpdates() {
    console.log('[UpdateChecker] Checking for updates...');
    const latestRelease = await fetchLatestRelease();
    const currentVersion = getCurrentVersion();

    if (latestRelease && latestRelease.tag_name) {
        const latestVersion = latestRelease.tag_name.replace(/^v/, ''); // Remove 'v' prefix if present
        console.log(`[UpdateChecker] Current version: ${currentVersion}, Latest version: ${latestVersion}`);

        // Simple version comparison (e.g., 1.0.0 vs 1.0.1)
        // This can be improved for more complex versioning schemes
        const isNewVersionAvailable = compareVersions(latestVersion, currentVersion) > 0;

        if (isNewVersionAvailable) {
            console.log('[UpdateChecker] New version available!');
            chrome.storage.local.set({
                newVersionAvailable: true,
                latestVersion: latestVersion,
                releaseUrl: latestRelease.html_url,
                releaseNotes: latestRelease.body,
                releaseDate: latestRelease.published_at,
                releaseSize: latestRelease.assets && latestRelease.assets.length > 0 ? latestRelease.assets[0].size : 0
            }, () => {
                // Open update page if this is a new version
                chrome.windows.create({
                    url: chrome.runtime.getURL('src/update.html'),
                    type: 'popup',
                    width: 450,
                    height: 600
                });
            });
        } else {
            console.log('[UpdateChecker] No new version available.');
            chrome.storage.local.set({
                newVersionAvailable: false,
                latestVersion: currentVersion,
                releaseUrl: '',
                releaseNotes: ''
            });
        }
    } else {
        console.log('[UpdateChecker] Could not retrieve latest release information.');
        chrome.storage.local.set({
            newVersionAvailable: false,
            latestVersion: currentVersion,
            releaseUrl: '',
            releaseNotes: ''
        });
    }
}

/**
 * Compares two version strings (e.g., '1.0.0', '1.0.1').
 * Returns > 0 if versionA is greater, < 0 if versionB is greater, 0 if equal.
 * @param {string} versionA
 * @param {string} versionB
 * @returns {number}
 */
function compareVersions(versionA, versionB) {
    const partsA = versionA.split('.').map(Number);
    const partsB = versionB.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const partA = partsA[i] || 0;
        const partB = partsB[i] || 0;

        if (partA > partB) return 1;
        if (partA < partB) return -1;
    }
    return 0;
}

// Expose functions for use by other modules
// For a background script, these might be directly called or exposed via messages
// For now, we'll just export them for clarity if this were a true module system.
// In a Chrome extension background script, functions are globally available if defined at top level.

// If this file is included in manifest.json as a background script, these functions will be globally available.
// If it's imported as a module, we'd use export.

// For now, let's assume it's included as a script in manifest.json and functions are globally available.