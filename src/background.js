chrome.runtime.onInstalled.addListener(() => {
  // Keeps the MV3 service worker registered for browsers that expect a background script.
});

function runtimeLastErrorMessage() {
  return chrome.runtime.lastError ? chrome.runtime.lastError.message : "";
}

function revokeWhenDownloadEnds(downloadId, url) {
  function handleDownloadChanged(delta) {
    if (
      delta.id === downloadId &&
      delta.state &&
      (delta.state.current === "complete" || delta.state.current === "interrupted")
    ) {
      URL.revokeObjectURL(url);
      chrome.downloads.onChanged.removeListener(handleDownloadChanged);
    }
  }

  chrome.downloads.onChanged.addListener(handleDownloadChanged);
}

function startSnapshotDownload(message, sendResponse) {
  const blob = new Blob([message.html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download({ url, filename: message.filename, saveAs: false }, (downloadId) => {
    const error = runtimeLastErrorMessage();
    if (error) {
      URL.revokeObjectURL(url);
      sendResponse({ ok: false, error });
      return;
    }

    if (typeof downloadId !== "number") {
      URL.revokeObjectURL(url);
      sendResponse({ ok: false, error: "The browser did not start the download." });
      return;
    }

    revokeWhenDownloadEnds(downloadId, url);
    sendResponse({ ok: true, downloadId });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "snapshot-download") {
    return false;
  }

  if (typeof message.html !== "string" || typeof message.filename !== "string") {
    sendResponse({ ok: false, error: "Invalid snapshot download request." });
    return false;
  }

  startSnapshotDownload(message, sendResponse);
  return true;
});
