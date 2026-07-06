/* ================= BOTÃO VOLTAR AO TOPO ================= */
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector(".scroll-top-btn");
    if (!btn) return;

    const toggleVisibility = () => {
        btn.classList.toggle("is-visible", window.scrollY > 480);
    };
    toggleVisibility();
    window.addEventListener("scroll", toggleVisibility, { passive: true });

    btn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
});
