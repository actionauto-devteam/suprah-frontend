(function () {
  "use strict";

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

  var pathSegment = encodeURIComponent(orgKey || "_");
  var query = [];
  if (vehicleId) query.push("vehicleId=" + encodeURIComponent(vehicleId));
  if (label) query.push("label=" + encodeURIComponent(label));
  var src = baseUrl + "/embed/chat/" + pathSegment + (query.length ? "?" + query.join("&") : "");

  var BUBBLE_SIZE = 64;
  var BUBBLE_MARGIN = 20;
  var PANEL_WIDTH = 384;
  var PANEL_HEIGHT = 544;

  var iframe = document.createElement("iframe");
  iframe.title = "Chat with us";
  iframe.src = src;
  iframe.setAttribute("scrolling", "no");
  iframe.style.position = "fixed";
  iframe.style.right = "calc(env(safe-area-inset-right, 0px) + " + BUBBLE_MARGIN + "px)";
  iframe.style.bottom = "calc(env(safe-area-inset-bottom, 0px) + " + BUBBLE_MARGIN + "px)";
  iframe.style.left = "auto";
  iframe.style.top = "auto";
  iframe.style.width = BUBBLE_SIZE + "px";
  iframe.style.height = BUBBLE_SIZE + "px";
  iframe.style.border = "0";
  iframe.style.background = "transparent";
  iframe.style.colorScheme = "normal";
  iframe.style.zIndex = "2147483000";
  iframe.style.borderRadius = "16px";
  iframe.style.transition = "width .2s ease, height .2s ease, right .2s ease, bottom .2s ease, left .2s ease, top .2s ease";
  iframe.setAttribute("allowtransparency", "true");

  var isOpen = false;

  function applySize() {
    if (!isOpen) {
      iframe.style.top = "auto";
      iframe.style.left = "auto";
      iframe.style.right = "calc(env(safe-area-inset-right, 0px) + " + BUBBLE_MARGIN + "px)";
      iframe.style.bottom = "calc(env(safe-area-inset-bottom, 0px) + " + BUBBLE_MARGIN + "px)";
      iframe.style.width = BUBBLE_SIZE + "px";
      iframe.style.height = BUBBLE_SIZE + "px";
      return;
    }

    var narrow = window.innerWidth < 640;
    if (narrow) {
      iframe.style.top = "0";
      iframe.style.left = "0";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
    } else {
      var height = Math.min(PANEL_HEIGHT, window.innerHeight - BUBBLE_MARGIN * 2);
      iframe.style.top = "auto";
      iframe.style.left = "auto";
      iframe.style.right = "calc(env(safe-area-inset-right, 0px) + " + BUBBLE_MARGIN + "px)";
      iframe.style.bottom = "calc(env(safe-area-inset-bottom, 0px) + " + BUBBLE_MARGIN + "px)";
      iframe.style.width = PANEL_WIDTH + "px";
      iframe.style.height = height + "px";
    }
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== childOrigin) return;
    if (event.source !== iframe.contentWindow) return;
    var data = event.data;
    if (!data || data.type !== "suprah-webchat:resize") return;
    isOpen = !!data.open;
    applySize();
  });

  window.addEventListener("resize", function () {
    if (isOpen) applySize();
  });

  function mount() {
    applySize();
    document.body.appendChild(iframe);
  }

  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount);
  }
})();
