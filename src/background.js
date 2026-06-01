chrome.runtime.onInstalled.addListener(() => {
  // Keeps the MV3 service worker registered for browsers that expect a background script.
});

function runtimeLastErrorMessage() {
  return chrome.runtime.lastError ? chrome.runtime.lastError.message : "";
}

function toBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function createSnapshotDownloadUrl(html) {
  const mimeType = "text/html;charset=utf-8";
  const urlApi = globalThis.URL;

  if (urlApi && typeof urlApi.createObjectURL === "function" && typeof urlApi.revokeObjectURL === "function") {
    const blob = new Blob([html], { type: mimeType });
    const url = urlApi.createObjectURL(blob);

    return {
      url,
      revoke() {
        urlApi.revokeObjectURL(url);
      }
    };
  }

  return {
    url: `data:${mimeType};base64,${toBase64Utf8(html)}`,
    revoke() {}
  };
}

function revokeWhenDownloadEnds(downloadId, downloadUrl) {
  function handleDownloadChanged(delta) {
    if (
      delta.id === downloadId &&
      delta.state &&
      (delta.state.current === "complete" || delta.state.current === "interrupted")
    ) {
      downloadUrl.revoke();
      chrome.downloads.onChanged.removeListener(handleDownloadChanged);
    }
  }

  chrome.downloads.onChanged.addListener(handleDownloadChanged);
}

function startSnapshotDownload(message, sendResponse) {
  const downloadUrl = createSnapshotDownloadUrl(message.html);

  chrome.downloads.download({ url: downloadUrl.url, filename: message.filename, saveAs: false }, (downloadId) => {
    const error = runtimeLastErrorMessage();
    if (error) {
      downloadUrl.revoke();
      sendResponse({ ok: false, error });
      return;
    }

    if (typeof downloadId !== "number") {
      downloadUrl.revoke();
      sendResponse({ ok: false, error: "The browser did not start the download." });
      return;
    }

    revokeWhenDownloadEnds(downloadId, downloadUrl);
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
