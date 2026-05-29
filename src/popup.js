(function () {
  "use strict";

  const filenameInput = document.getElementById("filename");
  const downloadButton = document.getElementById("download");
  const status = document.getElementById("status");

  function setStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type || ""}`.trim();
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function defaultFilename() {
    const now = new Date();
    return [
      "page-snapshot-",
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      "-",
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds()),
      ".html"
    ].join("");
  }

  function sanitizeFilename(input) {
    const cleaned = input
      .replace(/[\/\\:*?"<>|\x00-\x1f\x7f]/g, "")
      .replace(/^[.\s]+|[.\s]+$/g, "")
      .slice(0, 100)
      .replace(/^[.\s]+|[.\s]+$/g, "");

    if (!cleaned) {
      return defaultFilename();
    }

    let basename = cleaned.replace(/\.html$/i, "").replace(/^[.\s]+|[.\s]+$/g, "");

    if (!basename) {
      return defaultFilename();
    }

    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(basename)) {
      basename = `_${basename}`;
    }

    return `${basename}.html`;
  }

  function lastErrorMessage() {
    return chrome.runtime.lastError ? chrome.runtime.lastError.message : "";
  }

  function snapshotPage() {
    const documentClone = document.documentElement.cloneNode(true);
    const head = documentClone.querySelector("head") || documentClone.insertBefore(document.createElement("head"), documentClone.firstChild);
    const hasBase = Boolean(head.querySelector("base[href]"));

    if (!hasBase) {
      const base = document.createElement("base");
      base.setAttribute("href", document.baseURI || window.location.href);
      head.insertBefore(base, head.firstChild);
    }

    return `<!doctype html>\n${documentClone.outerHTML}`;
  }

  function isRestrictedUrl(url) {
    return /^(about|chrome|chrome-extension|edge|moz-extension):/i.test(url || "");
  }

  function snapshotErrorMessage(message) {
    if (/^(Cannot access|The extensions gallery cannot be scripted|This page cannot be scripted)/i.test(message || "")) {
      return "Cannot snapshot this page (restricted URL).";
    }

    return message || "Snapshot failed.";
  }

  function getActiveTab() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const error = lastErrorMessage();
        if (error) {
          reject(new Error(error));
          return;
        }

        const tab = tabs && tabs[0];
        if (!tab || typeof tab.id !== "number") {
          reject(new Error("No active tab is available."));
          return;
        }

        resolve(tab);
      });
    });
  }

  function captureSnapshot(tab) {
    if (isRestrictedUrl(tab.url)) {
      return Promise.reject(new Error("Cannot snapshot this page (restricted URL)."));
    }

    return new Promise((resolve, reject) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: snapshotPage
        },
        (results) => {
          const error = lastErrorMessage();
          if (error) {
            reject(new Error(snapshotErrorMessage(error)));
            return;
          }

          const html = results && results[0] && results[0].result;
          if (typeof html !== "string" || !html) {
            reject(new Error("The page did not return snapshot content."));
            return;
          }

          resolve(html);
        }
      );
    });
  }

  function downloadSnapshot(html, filename) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "snapshot-download", html, filename }, (response) => {
        const error = lastErrorMessage();
        if (error) {
          reject(new Error(error));
          return;
        }

        if (!response || !response.ok) {
          reject(new Error((response && response.error) || "The browser did not start the download."));
          return;
        }

        resolve(response.downloadId);
      });
    });
  }

  async function handleDownload() {
    downloadButton.disabled = true;
    setStatus("Creating snapshot...", "");

    try {
      const filename = sanitizeFilename(filenameInput.value);
      const tab = await getActiveTab();
      const html = await captureSnapshot(tab);
      await downloadSnapshot(html, filename);
      setStatus(`Download started: ${filename}`, "success");
    } catch (error) {
      setStatus(error.message || "Snapshot failed.", "error");
    } finally {
      downloadButton.disabled = false;
    }
  }

  downloadButton.addEventListener("click", handleDownload);
})();
