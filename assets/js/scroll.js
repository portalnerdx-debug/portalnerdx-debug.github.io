/* ================= SCROLL SUAVE + REVEAL ================= */
document.addEventListener("DOMContentLoaded", () => {
    // Links âncora internos
    document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach((link) => {
        link.addEventListener("click", (e) => {
            const target = document.querySelector(link.getAttribute("href"));
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    // Reveal de elementos marcados com [data-animate]

    // Sem suporte a IntersectionObserver: só garante que tudo fique visível,
    // inclusive o que for inserido depois (ex.: cards vindos de fetch).
    if (!("IntersectionObserver" in window)) {
        const revealAll = () => {
            document.querySelectorAll("[data-animate]:not(.is-visible)")
                .forEach((el) => el.classList.add("is-visible"));
        };
        revealAll();
        new MutationObserver(revealAll).observe(document.body, { childList: true, subtree: true });
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.15 }
    );

    // Observa tudo que já existe no carregamento da página.
    document.querySelectorAll("[data-animate]").forEach((el) => observer.observe(el));

    // Observa também [data-animate] inserido DEPOIS do carregamento inicial —
    // é o caso dos cards de post que home-feed.js e category-feed.js montam
    // de forma assíncrona (só chegam no DOM depois que o fetch responde).
    // Sem isso, esses cards nasciam com opacity:0 (regra do animations.css)
    // e nunca eram "descobertos" pelo observer, ficando invisíveis para sempre
    // mesmo com a seção deles visível.
    new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                if (node.matches && node.matches("[data-animate]")) observer.observe(node);
                if (node.querySelectorAll) {
                    node.querySelectorAll("[data-animate]").forEach((el) => observer.observe(el));
                }
            });
        });
    }).observe(document.body, { childList: true, subtree: true });
});
