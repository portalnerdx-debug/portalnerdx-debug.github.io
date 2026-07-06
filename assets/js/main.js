/* =========================================================
   NERD X — SCRIPT PRINCIPAL
   Cada funcionalidade vive no seu próprio arquivo (header.js,
   menu.js, theme.js...). Este arquivo cuida só do que é
   global e específico de cada página (ex.: data no topo).
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    const dateEl = document.querySelector("#current-date");
    if (dateEl) {
        const formatted = new Intl.DateTimeFormat("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
        }).format(new Date());
        dateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }

    if (window.nerdxTrack) {
        window.nerdxTrack("page_view", { path: window.location.pathname });
    }
});
