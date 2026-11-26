(function () {
  "use strict";

  if (window.__suprahWebchatLoaded) return;

  function findOwnScript() {
    if (document.currentScript) return document.currentScript;
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (/webchat-embed\.js/.test(scripts[i].src)) return scripts[i];
    }
    return null;
  }

  var script = findOwnScript();
  if (!script) return;

  var orgKey = script.getAttribute("data-org") || "";
  var vehicleId = script.getAttribute("data-vehicle-id") || "";
  var label = script.getAttribute("data-label") || "";
  var baseUrlAttr = script.getAttribute("data-base-url");

  if (!orgKey && !vehicleId) {
    console.warn("[Suprah webchat] Missing data-org or data-vehicle-id on the embed script tag; chat widget not loaded.");
    return;
  }

  var baseUrl;
  try {
    baseUrl = baseUrlAttr || new URL(script.src, window.location.href).origin;
  } catch (err) {
    console.warn("[Suprah webchat] Could not resolve widget origin; chat widget not loaded.");
    return;
  }

  var childOrigin;
  try {
    childOrigin = new URL(baseUrl).origin;
  } catch (err) {
    console.warn("[Suprah webchat] Invalid data-base-url; chat widget not loaded.");
    return;
  }

  window.__suprahWebchatLoaded = true;

  var pathSegment = encodeURIComponent(orgKey || "_");
  var query = ["launcher=page"];
  if (vehicleId) query.push("vehicleId=" + encodeURIComponent(vehicleId));
  if (label) query.push("label=" + encodeURIComponent(label));
  var src = baseUrl + "/embed/chat/" + pathSegment + "?" + query.join("&");

  var EDGE = 20;
  var PANEL_WIDTH = 380;
  var PANEL_HEIGHT = 640;
  var NARROW_WIDTH = 640;
  var GREEN = "#00b262";
  var INK = "#080b14";
  var FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  var host = document.createElement("div");
  host.setAttribute("data-suprah-webchat", "");
  host.style.cssText =
    "position:fixed;z-index:2147483000;margin:0;padding:0;" +
    "right:calc(env(safe-area-inset-right, 0px) + " + EDGE + "px);" +
    "bottom:calc(env(safe-area-inset-bottom, 0px) + " + EDGE + "px);";

  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
  root.innerHTML =
    "<style>" +
    ".suprah-wc-launcher{all:initial;box-sizing:border-box;position:relative;display:inline-flex;align-items:center;gap:8px;height:52px;padding:0 22px;border-radius:999px;" +
    "background:" + GREEN + ";color:" + INK + ";font-family:" + FONT + ";font-size:15px;font-weight:600;line-height:1;white-space:nowrap;cursor:pointer;" +
    "box-shadow:0 8px 24px rgba(8,11,20,.22);transition:transform .15s ease,box-shadow .15s ease;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}" +
    ".suprah-wc-launcher:hover{transform:translateY(-1px);box-shadow:0 10px 28px rgba(8,11,20,.28);}" +
    ".suprah-wc-launcher:focus-visible{outline:3px solid " + INK + ";outline-offset:3px;}" +
    ".suprah-wc-launcher svg{width:20px;height:20px;flex:none;}" +
    ".suprah-wc-badge{all:initial;box-sizing:border-box;position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;" +
    "background:#dc2626;color:#fff;font-family:" + FONT + ";font-size:11px;font-weight:700;line-height:20px;text-align:center;}" +
    ".suprah-wc-badge[hidden]{display:none;}" +
    "</style>" +
    '<button type="button" class="suprah-wc-launcher" aria-label="Text Us">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path></svg>' +
    "<span>Text Us</span>" +
    '<span class="suprah-wc-badge" hidden></span>' +
    "</button>";

  var launcher = root.querySelector(".suprah-wc-launcher");
  var badge = root.querySelector(".suprah-wc-badge");

  var iframe = document.createElement("iframe");
  iframe.title = "Text Us";
  iframe.src = src;
  iframe.setAttribute("scrolling", "no");
  iframe.setAttribute("allowtransparency", "true");
  iframe.setAttribute("data-suprah-webchat", "");
  iframe.style.position = "fixed";
  iframe.style.border = "0";
  iframe.style.margin = "0";
  iframe.style.padding = "0";
  iframe.style.background = "transparent";
  iframe.style.colorScheme = "light";
  iframe.style.zIndex = "2147483001";
  iframe.style.visibility = "hidden";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.transition = "opacity .18s ease";

  var ready = false;
  var wantOpen = false;
  var shown = false;

  function applySize() {
    if (window.innerWidth < NARROW_WIDTH) {
      iframe.style.top = "0";
      iframe.style.left = "0";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.borderRadius = "0";
      iframe.style.boxShadow = "none";
    } else {
      iframe.style.top = "auto";
      iframe.style.left = "auto";
      iframe.style.right = "calc(env(safe-area-inset-right, 0px) + " + EDGE + "px)";
      iframe.style.bottom = "calc(env(safe-area-inset-bottom, 0px) + " + EDGE + "px)";
      iframe.style.width = PANEL_WIDTH + "px";
      iframe.style.height = Math.min(PANEL_HEIGHT, window.innerHeight - EDGE * 2) + "px";
      iframe.style.borderRadius = "16px";
      iframe.style.boxShadow = "0 16px 48px rgba(8,11,20,.25)";
    }
  }

  function sendOpen() {
    if (iframe.contentWindow) iframe.contentWindow.postMessage({ type: "suprah-webchat:open" }, childOrigin);
  }

  function showPanel() {
    shown = true;
    wantOpen = false;
    applySize();
    iframe.style.visibility = "visible";
    iframe.style.opacity = "1";
    iframe.style.pointerEvents = "auto";
    host.style.display = "none";
    iframe.focus();
  }

  function hidePanel() {
    shown = false;
    wantOpen = false;
    iframe.style.visibility = "hidden";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    host.style.display = "";
    launcher.focus({ preventScroll: true });
  }

  function setBadge(count) {
    var value = Number(count) || 0;
    if (value > 0) {
      badge.textContent = value > 9 ? "9+" : String(value);
      badge.hidden = false;
      launcher.setAttribute("aria-label", "Text Us, " + value + " new " + (value === 1 ? "reply" : "replies"));
    } else {
      badge.textContent = "";
      badge.hidden = true;
      launcher.setAttribute("aria-label", "Text Us");
    }
  }

  launcher.addEventListener("click", function () {
    wantOpen = true;
    if (ready) sendOpen();
  });

  window.addEventListener("message", function (event) {
    if (event.origin !== childOrigin) return;
    if (event.source !== iframe.contentWindow) return;
    var data = event.data;
    if (!data || typeof data.type !== "string") return;
    if (data.type === "suprah-webchat:ready") {
      ready = true;
      if (wantOpen) sendOpen();
    } else if (data.type === "suprah-webchat:unread") {
      setBadge(data.count);
    } else if (data.type === "suprah-webchat:theme") {
      var color = String(data.color || "");
      var ink = String(data.ink || "");
      if (/^#[0-9a-f]{6}$/i.test(color)) {
        launcher.style.background = color;
        launcher.style.color = /^#[0-9a-f]{6}$/i.test(ink) ? ink : INK;
      }
    } else if (data.type === "suprah-webchat:resize") {
      if (data.open) {
        if (!shown) showPanel();
      } else if (shown) {
        hidePanel();
      }
    }
  });

  window.addEventListener("resize", applySize);

  function mount() {
    applySize();
    document.body.appendChild(iframe);
    document.body.appendChild(host);
  }

  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount);
  }
})();
