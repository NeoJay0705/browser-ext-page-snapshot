# Page Snapshot

Save the current browser tab DOM as a local single-file `.html` snapshot.

## Features

- Manual filename entry with automatic `.html` extension handling.
- Automatic filename fallback like `page-snapshot-YYYYMMDD-HHMMSS.html`.
- Pure local processing: page content is never sent to external servers.
- Cross-browser Manifest V3 extension for Chrome, Firefox, and Microsoft Edge.

## Install (from this git repo)

### Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository directory.

### Microsoft Edge

1. Open `edge://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository directory.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `manifest.json` from this repository.
4. Firefox temporary add-ons are removed after restart, so reload it after restarting Firefox.

## Usage

Click the Page Snapshot extension icon, enter a basename or leave it blank, then click **Download Snapshot**.

## Permissions

- `activeTab`: allows capturing only the currently active tab after you click the extension.
- `scripting`: injects the snapshot function into the active tab on demand.
- `downloads`: saves the generated `.html` file locally.

Page Snapshot processes content locally in the browser and does not transmit page content to any external server.

## Limitations

- External resources such as images, scripts, stylesheets, and fonts are referenced but not inlined.
- Browser internal pages and restricted extension store pages cannot be captured.
- Very large pages may take longer to serialize and download.

## License

MIT