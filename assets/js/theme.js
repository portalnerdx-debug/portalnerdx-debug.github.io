/* =========================================================
   NERD X — TEMA (claro/escuro)
   Persiste a escolha do usuário em localStorage e respeita
   o esquema de cor do sistema operacional na 1ª visita.
   ========================================================= */
(function () {
    const STORAGE_KEY = "nerdx-theme";
    const root = document.documentElement;

    function getPreferredTheme() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === "light" || saved === "dark") return saved;
        return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }

    function applyTheme(theme) {
        root.setAttribute("data-theme", theme);
        document.querySelectorAll(".theme-btn").forEach((btn) => {
            btn.setAttribute("aria-pressed", theme === "light");
            btn.setAttribute("aria-label", theme === "light" ? "Ativar modo escuro" : "Ativar modo claro");
        });
    }

    applyTheme(getPreferredTheme());

    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll(".theme-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const current = root.getAttribute("data-theme") === "light" ? "light" : "dark";
                const next = current === "light" ? "dark" : "light";
                applyTheme(next);
                localStorage.setItem(STORAGE_KEY, next);
            });
        });
    });
})();
