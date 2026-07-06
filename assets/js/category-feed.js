/* =========================================================
   CATEGORY FEED — puxa os artigos publicados (api/posts.json)
   e preenche a grade da PRÓPRIA página de categoria (Notícias,
   Marvel, DC, Tecnologia, Ficção Científica, Reviews) com as
   últimas postagens daquela categoria.

   Isso existe porque as páginas de categoria são estáticas: o
   painel admin tenta gravar o card direto no HTML no momento da
   publicação, mas isso só funciona se o arquivo certo for
   reenviado pro repositório depois. Este script é a rede de
   segurança que garante que a categoria sempre mostre os posts
   corretos com base no api/posts.json, não importa o que esteja
   salvo no HTML.

   Se não houver nenhum post publicado ainda para a categoria, a
   página mantém o estado estático (empty-state) que já existe.
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    const CATEGORY_BY_SLUG = {
        "noticias": "Notícias",
        "marvel": "Marvel",
        "dc": "DC",
        "tecnologia": "Tecnologia",
        "ficcao": "Ficção Científica",
        "reviews": "Reviews"
    };

    const TAG_CLASS = {
        "Notícias": "noticias", "Marvel": "marvel", "DC": "dc",
        "Tecnologia": "tech", "Ficção Científica": "scifi", "Reviews": "reviews"
    };

    // Descobre a categoria da página atual pela URL: .../categorias/<slug>/...
    const match = location.pathname.match(/\/categorias\/([^/]+)\/[^/]*$/);
    const slug = match ? match[1] : null;
    const categoriaLabel = slug ? CATEGORY_BY_SLUG[slug] : null;
    if (!categoriaLabel) return;

    let posts;
    try {
        const res = await fetch(`../../api/posts.json?v=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const text = await res.text();
        if (!text.trim()) return;
        posts = JSON.parse(text);
    } catch (e) {
        return;
    }
    if (!Array.isArray(posts) || !posts.length) return;

    function escapeHtml(str) {
        return (str || "")
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function parseDate(d) {
        const t = Date.parse(d);
        return isNaN(t) ? 0 : t;
    }

    function postCard(post) {
        const tag = TAG_CLASS[post.categoria] || "noticias";
        const img = post.imagem ? ` style="background-image:url('${post.imagem}');background-size:cover;background-position:center;"` : "";
        return `<article class="post-card" data-animate>
            <div class="news-image"${img}></div>
            <div class="post-body">
                <span class="tag ${tag}">${escapeHtml(post.categoria)}</span>
                <h3><a href="${post.slug}.html">${escapeHtml(post.titulo)}</a></h3>
                <p>${escapeHtml(post.resumo)}</p>
                <div class="post-meta"><span>✍️ ${escapeHtml(post.autor || "Nerd-X")}</span><span>📅 ${post.data}</span></div>
            </div>
        </article>`;
    }

    // Somente os posts DESTA categoria, do mais novo pro mais antigo.
    const items = posts
        .filter(p => p.categoria === categoriaLabel)
        .sort((a, b) => parseDate(b.data) - parseDate(a.data));

    // Sem posts publicados ainda: mantém o empty-state estático da página.
    if (!items.length) return;

    const main = document.getElementById("conteudo");
    if (!main) return;

    let grid = main.querySelector(".post-grid");
    if (!grid) {
        // Ainda não existe grade (a página só tinha o empty-state) — cria uma.
        const emptyState = main.querySelector(".empty-state");
        const oldSection = emptyState ? emptyState.closest("section") : null;

        const section = document.createElement("section");
        const container = document.createElement("div");
        container.className = "container";
        grid = document.createElement("div");
        grid.className = "post-grid";
        container.appendChild(grid);
        section.appendChild(container);

        if (oldSection) {
            oldSection.replaceWith(section);
        } else {
            main.appendChild(section);
        }
    }

    // Substitui o conteúdo da grade pelos posts reais desta categoria,
    // sempre em sincronia com o api/posts.json.
    grid.innerHTML = items.map(postCard).join("");
});
