(function () {
  var KEY = "nerdx_cookie_consent";
  if (localStorage.getItem(KEY)) return;

  var bar = document.createElement("div");
  bar.setAttribute("role", "dialog");
  bar.setAttribute("aria-label", "Aviso de cookies");
  bar.style.cssText =
    "position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#0D0F14;color:#fff;" +
    "padding:16px;font:14px/1.5 system-ui,sans-serif;display:flex;gap:12px;flex-wrap:wrap;" +
    "align-items:center;justify-content:center;box-shadow:0 -2px 10px rgba(0,0,0,.3)";

  bar.innerHTML =
    '<span style="max-width:640px">Usamos cookies próprios e de parceiros (incluindo Google AdSense) para ' +
    'melhorar sua experiência e exibir anúncios personalizados. Ao continuar navegando, você concorda com nossa ' +
    '<a href="/privacidade.html" style="color:#8ab4f8">Política de Privacidade</a>.</span>' +
    '<button id="nerdx-cookie-accept" style="background:#1a73e8;color:#fff;border:0;padding:8px 16px;' +
    'border-radius:6px;cursor:pointer;font-weight:600">Aceitar</button>';

  document.body.appendChild(bar);
  document.getElementById("nerdx-cookie-accept").addEventListener("click", function () {
    localStorage.setItem(KEY, "1");
    bar.remove();
  });
})();
