/* =========================================================
   COMENTÁRIOS — stub de integração.
   Troque por um provedor real (Disqus, Utterances, giscus)
   quando o backend/conta estiver definido.
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    const mount = document.querySelector("#comments-mount");
    if (!mount) return;
    mount.innerHTML = `<p class="form-feedback">Sistema de comentários em configuração — volte em breve.</p>`;
});
