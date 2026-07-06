/* =========================================================
   NERD X STUDIO — MOTOR DE PUBLICAÇÃO
   Gera os arquivos reais do site estático (HTML + JSON)
   para o autor baixar e subir no repositório do GitHub Pages.
   Não depende de token nem de backend.
   ========================================================= */

const NERDX_CATEGORIES = {
    "Notícias":            { slug: "noticias",   tag: "noticias", icon: "📰" },
    "Marvel":              { slug: "marvel",     tag: "marvel",   icon: "🕷️" },
    "DC":                  { slug: "dc",         tag: "dc",       icon: "🦇" },
    "Tecnologia":          { slug: "tecnologia", tag: "tech",     icon: "💻" },
    "Ficção Científica":   { slug: "ficcao",     tag: "scifi",    icon: "🚀" },
    "Reviews":             { slug: "reviews",    tag: "reviews",  icon: "⭐" }
};

const NerdxPublish = (() => {

    function slugify(text) {
        return (text || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9 ]/g, "")
            .trim()
            .replace(/\s+/g, "-");
    }

    function escapeHtml(str) {
        return (str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    // Mini-formatação: linhas em branco separam parágrafos,
    // "## " vira H2, "- " vira item de lista, **texto** vira negrito.
    function contentToHtml(raw) {
        const blocks = (raw || "").replace(/\r\n/g, "\n").split(/\n\s*\n/);
        let html = "";
        blocks.forEach(block => {
            const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
            if (!lines.length) return;

            if (lines.every(l => l.startsWith("- "))) {
                html += "<ul>" + lines.map(l => `<li>${inline(l.slice(2))}</li>`).join("") + "</ul>\n";
                return;
            }
            if (lines[0].startsWith("## ")) {
                html += `<h2>${inline(lines[0].slice(3))}</h2>\n`;
                return;
            }
            if (lines[0].startsWith("### ")) {
                html += `<h3>${inline(lines[0].slice(4))}</h3>\n`;
                return;
            }
            html += `<p>${lines.map(inline).join("<br>")}</p>\n`;
        });
        return html || "<p></p>";

        function inline(text) {
            let t = escapeHtml(text);

            // Marca posições de trecho já convertido em link, pra não tentar
            // linkar de novo o que já é um <a>.
            const placeholders = [];
            function stash(html) {
                const key = `\u0000LINK${placeholders.length}\u0000`;
                placeholders.push(html);
                return key;
            }

            // 1) Sintaxe [texto do link](https://site.com ou mailto:...)
            t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, (m, label, url) => {
                const external = url.startsWith("http");
                return stash(`<a href="${url}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`);
            });

            // 2) URL "solta" colada direto no texto (sem colchetes), com ou sem
            // protocolo (https://exemplo.com, http://exemplo.com ou www.exemplo.com).
            t = t.replace(/(^|[\s(])((https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)])/g, (m, pre, url) => {
                const href = url.startsWith("http") ? url : `https://${url}`;
                return `${pre}` + stash(`<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`);
            });

            // 3) E-mail solto (sem mailto: explícito)
            t = t.replace(/(^|[\s(])([\w.+-]+@[\w-]+\.[a-z]{2,})(?=[\s)<]|$)/gi, (m, pre, email) => {
                return `${pre}` + stash(`<a href="mailto:${email}">${email}</a>`);
            });

            t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

            // Restaura os links convertidos.
            t = t.replace(/\u0000LINK(\d+)\u0000/g, (m, i) => placeholders[Number(i)]);

            return t;
        }
    }

    function plainTextExcerpt(raw, max = 160) {
        const text = (raw || "").replace(/\r\n/g, " ").replace(/\n/g, " ").replace(/[#*-]/g, "").trim();
        return text.length > max ? text.slice(0, max - 1).trim() + "…" : text;
    }

    async function readImageAsDataURL(file) {
        if (!file) return null;
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function fetchExistingJSON(relativePath, fallback) {
        try {
            const res = await fetch(`${relativePath}?v=${Date.now()}`, { cache: "no-store" });
            if (!res.ok) return fallback;
            const text = await res.text();
            if (!text.trim()) return fallback;
            return JSON.parse(text);
        } catch (e) {
            return fallback;
        }
    }

    function todayISO() {
        return new Date().toISOString().slice(0, 10);
    }

    const SCRIPTS = [
        "analytics.js", "theme.js", "darkmode.js", "header.js", "menu.js",
        "scroll.js", "scrolltop.js", "newsletter.js", "lazyload.js", "main.js"
    ];

    function headBlock(post, depth) {
        const url = `https://nerdx.com.br/categorias/${post.categoriaSlug}/${post.slug}.html`;
        const metaTitle = post.seoTitle || `${post.titulo} | Nerd X`;
        const metaDesc = escapeHtml(post.seoDescription || post.resumo || plainTextExcerpt(post.conteudo));
        return `<meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(metaTitle)}</title>
    <meta name="description" content="${metaDesc}">
    <meta name="theme-color" content="#0D0F14">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Nerd X">
    <meta property="og:title" content="${escapeHtml(metaTitle)}">
    <meta property="og:description" content="${metaDesc}">
    <meta property="og:url" content="${url}">
    <meta property="og:locale" content="pt_BR">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(metaTitle)}">
    <meta name="twitter:description" content="${metaDesc}">
    <link rel="icon" href="${depth}favicon.ico">
    <link rel="stylesheet" href="${depth}assets/css/style.css">
    <script type="application/ld+json">
    ${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": post.titulo,
        "description": post.resumo || plainTextExcerpt(post.conteudo),
        "author": { "@type": "Person", "name": post.autor || "Nerd-X" },
        "datePublished": post.data,
        "publisher": { "@type": "Organization", "name": "Nerd X" }
    }, null, 4)}
    </script>`;
    }

    function headerNavBlock(depth, activeSlug) {
        const link = (href, label, catSlug) =>
            `<li><a href="${depth}${href}"${catSlug === activeSlug ? ' aria-current="page"' : ""}>${label}</a></li>`;
        return `<a href="#conteudo" class="skip-link">Pular para o conteúdo</a>

<div class="top-bar">
    <div class="container top-bar-content">
        <div class="top-left">📰 Últimas: Bem-vindo ao novo Nerd X!</div>
        <div class="top-right"><span id="current-date"></span></div>
    </div>
</div>

<header>
    <div class="container">
        <div class="logo"><a href="${depth}index.html"><span class="logo-x">X</span><span class="logo-text">NERD</span></a></div>
        <button class="menu-toggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="main-nav"><span></span><span></span><span></span></button>
        <nav id="main-nav">
            <ul>
                <li><a href="${depth}index.html">Home</a></li>
                ${link("categorias/noticias/index.html", "Notícias", "noticias")}
                ${link("categorias/marvel/index.html", "Marvel", "marvel")}
                ${link("categorias/dc/index.html", "DC", "dc")}
                ${link("categorias/tecnologia/index.html", "Tecnologia", "tecnologia")}
                ${link("categorias/ficcao/index.html", "Ficção", "ficcao")}
                ${link("categorias/reviews/index.html", "Reviews", "reviews")}
                <li><a href="${depth}contato.html">Contato</a></li>
            </ul>
        </nav>
        <div class="header-actions">
            <button class="theme-btn" aria-pressed="false" aria-label="Ativar modo claro">
                <span class="icon-sun">🌙</span><span class="icon-moon">☀️</span>
            </button>
        </div>
    </div>
</header>`;
    }

    function footerBlock(depth) {
        return `<footer>
    <div class="container">
        <div class="footer-grid">
            <div class="footer-brand">
                <div class="logo"><a href="${depth}index.html"><span class="logo-x">X</span><span class="logo-text">NERD</span></a></div>
                <p>Notícias, reviews e análises do universo geek — Marvel, DC, tecnologia e ficção científica, todos os dias.</p>
                <div class="footer-social">
                    <a href="#" aria-label="Nerd X no Instagram">📷</a>
                    <a href="#" aria-label="Nerd X no X (Twitter)">🐦</a>
                    <a href="#" aria-label="Nerd X no YouTube">▶️</a>
                    <a href="#" aria-label="Nerd X no Discord">🎮</a>
                </div>
            </div>
            <div class="footer-col">
                <h5>Categorias</h5>
                <ul>
                    <li><a href="${depth}categorias/marvel/index.html">Marvel</a></li>
                    <li><a href="${depth}categorias/dc/index.html">DC</a></li>
                    <li><a href="${depth}categorias/tecnologia/index.html">Tecnologia</a></li>
                    <li><a href="${depth}categorias/ficcao/index.html">Ficção Científica</a></li>
                    <li><a href="${depth}categorias/reviews/index.html">Reviews</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h5>Institucional</h5>
                <ul>
                    <li><a href="${depth}sobre.html">Sobre nós</a></li>
                    <li><a href="${depth}contato.html">Contato</a></li>
                    <li><a href="${depth}termos.html">Termos de uso</a></li>
                    <li><a href="${depth}privacidade.html">Privacidade</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h5>Comunidade</h5>
                <ul>
                    <li><a href="${depth}newsletter/index.html">Newsletter</a></li>
                    <li><a href="${depth}comentarios/index.html">Comentários</a></li>
                    <li><a href="${depth}pesquisa.html">Buscar</a></li>
                </ul>
            </div>
        </div>
        <div class="footer-bottom">
            <span>© 2026 Nerd X. Todos os direitos reservados.</span>
            <span>Feito com 🖤 para quem vive o universo geek.</span>
        </div>
    </div>
</footer>

<button class="scroll-top-btn" aria-label="Voltar ao topo">↑</button>

${SCRIPTS.map(s => `<script src="${depth}assets/js/${s}"></script>`).join("\n")}`;
    }

    function buildArticleHTML(post) {
        const depth = "../../";
        // Título e foto de capa vivem juntos em .article-hero (um bloco normal
        // do fluxo, nunca fixed/sticky), com um scrim garantindo contraste do
        // texto sobre a foto. Assim o título nunca cobre a foto além do
        // necessário nem o corpo do artigo: ao rolar, o hero sai de tela como
        // qualquer elemento comum e o texto do artigo aparece na sequência.
        const coverStyle = post.imagemDataUrl
            ? ` style="background-image:url('${post.imagemDataUrl}');background-size:cover;background-position:center;"`
            : "";

        return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    ${headBlock(post, depth)}
</head>
<body>
${headerNavBlock(depth, post.categoriaSlug)}

<main id="conteudo">
    <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb" style="padding-top:var(--space-6);font-family:var(--font-mono);font-size:var(--fs-sm);color:var(--color-dust);">
            <a href="${depth}index.html">Home</a> &raquo;
            <a href="${depth}categorias/${post.categoriaSlug}/index.html">${escapeHtml(post.categoria)}</a> &raquo;
            <span>${escapeHtml(post.titulo)}</span>
        </nav>

        <header class="article-hero">
            <div class="article-hero-cover"${coverStyle}></div>
            <div class="article-hero-scrim"></div>
            <div class="article-hero-content">
                <span class="tag ${post.categoriaTag}">${escapeHtml(post.categoria)}</span>
                <h1>${escapeHtml(post.titulo)}</h1>
                <div class="article-meta">
                    <span>✍️ ${escapeHtml(post.autor || "Nerd-X")}</span>
                    <span>📅 ${post.data}</span>
                </div>
            </div>
        </header>

        <div class="article-body">
            ${post.conteudoHtml}
        </div>

        <div class="article-share">
            <a class="btn-outline" href="${depth}categorias/${post.categoriaSlug}/index.html">← Voltar para ${escapeHtml(post.categoria)}</a>
        </div>

        <section id="comments-mount" style="margin-block: var(--space-10);"></section>
    </div>
</main>

${footerBlock(depth)}
</body>
</html>
`;
    }

    function buildPostCardHTML(post) {
        const img = post.imagemDataUrl
            ? ` style="background-image:url('${post.imagemDataUrl}');background-size:cover;background-position:center;"`
            : "";
        return `<article class="post-card" data-animate>
                    <div class="news-image"${img}></div>
                    <div class="post-body">
                        <span class="tag ${post.categoriaTag}">${escapeHtml(post.categoria)}</span>
                        <h3><a href="${post.slug}.html">${escapeHtml(post.titulo)}</a></h3>
                        <p>${escapeHtml(post.resumo || plainTextExcerpt(post.conteudo))}</p>
                        <div class="post-meta"><span>✍️ ${escapeHtml(post.autor || "Nerd-X")}</span><span>📅 ${post.data}</span></div>
                    </div>
                </article>`;
    }

    // Recebe o HTML atual da página da categoria e devolve a versão atualizada
    // com o novo artigo inserido (cria o grid se a categoria ainda estiver vazia).
    function updateCategoryIndexHTML(currentHtml, post) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(currentHtml, "text/html");
        const main = doc.querySelector("main#conteudo");
        if (!main) return null;

        let grid = main.querySelector(".post-grid");
        const emptyState = main.querySelector(".empty-state");

        if (!grid) {
            const section = doc.createElement("section");
            const container = doc.createElement("div");
            container.className = "container";
            grid = doc.createElement("div");
            grid.className = "post-grid";
            container.appendChild(grid);
            section.appendChild(container);

            if (emptyState) {
                emptyState.closest("section").replaceWith(section);
            } else {
                main.appendChild(section);
            }
        }

        const wrapper = doc.createElement("div");
        wrapper.innerHTML = buildPostCardHTML(post);
        grid.prepend(wrapper.firstElementChild);

        return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
    }

    function removeCategoryCard(currentHtml, slug) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(currentHtml, "text/html");
        const link = doc.querySelector(`.post-grid a[href="${slug}.html"]`);
        if (link) {
            const card = link.closest(".post-card");
            if (card) card.remove();
        }
        const grid = doc.querySelector(".post-grid");
        if (grid && !grid.children.length) {
            const section = grid.closest("section");
            const container = doc.createElement("div");
            container.className = "container";
            container.innerHTML = `<div class="empty-state" data-animate>
                <div class="icon">📭</div>
                <h3>Nenhuma matéria por aqui ainda</h3>
                <p>Volte em breve para conferir novas publicações.</p>
            </div>`;
            if (section) section.replaceWith((() => {
                const s = doc.createElement("section");
                s.appendChild(container);
                return s;
            })());
        }
        return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
    }

    // ---------------------------------------------------------------
    // HOME (index.html) — destaque + grids das últimas postagens.
    // Recebe o HTML atual da home e a lista de posts (já ordenada do
    // mais novo pro mais antigo) e devolve a home com o hero e os
    // cards das últimas postagens atualizados, exatamente como
    // updateCategoryIndexHTML faz para as páginas de categoria.
    // ---------------------------------------------------------------

    function tagFor(categoriaLabel) {
        const found = NERDX_CATEGORIES[categoriaLabel];
        return found ? found.tag : "noticias";
    }

    function coverOf(post) {
        return post.imagem || post.imagemDataUrl || null;
    }

    function buildHomePostCardHTML(post) {
        const img = coverOf(post)
            ? ` style="background-image:url('${coverOf(post)}');background-size:cover;background-position:center;"`
            : "";
        return `<article class="post-card" data-animate>
            <div class="news-image"${img}></div>
            <div class="post-body">
                <span class="tag ${tagFor(post.categoria)}">${escapeHtml(post.categoria)}</span>
                <h3><a href="${post.url}">${escapeHtml(post.titulo)}</a></h3>
                <p>${escapeHtml(post.resumo || plainTextExcerpt(post.conteudo))}</p>
                <div class="post-meta"><span>✍️ ${escapeHtml(post.autor || "Nerd-X")}</span><span>📅 ${post.data}</span></div>
            </div>
        </article>`;
    }

    function buildHomeMiniCardHTML(post) {
        return `<article class="mini-card" data-animate>
                    <span class="tag ${tagFor(post.categoria)}">${escapeHtml(post.categoria)}</span>
                    <h4><a href="${post.url}">${escapeHtml(post.titulo)}</a></h4>
                </article>`;
    }

    function buildHomeFeatureHTML(post) {
        const img = coverOf(post)
            ? ` style="background-image:url('${coverOf(post)}');background-size:cover;background-position:center;"`
            : "";
        return `<article class="news-feature" data-animate>
                <div class="news-image"${img}></div>
                <div class="news-content">
                    <span class="tag ${tagFor(post.categoria)}">${escapeHtml(post.categoria)}</span>
                    <h3>${escapeHtml(post.titulo)}</h3>
                    <p>${escapeHtml(post.resumo || plainTextExcerpt(post.conteudo))}</p>
                    <a href="${post.url}" class="read-more">Leia mais →</a>
                </div>
            </article>`;
    }

    function fillHomeCategorySection(doc, sectionId, gridId, items) {
        const section = doc.getElementById(sectionId);
        const grid = doc.getElementById(gridId);
        if (!section || !grid) return;
        if (!items.length) {
            grid.innerHTML = "";
            section.style.display = "none";
            return;
        }
        grid.innerHTML = items.map(buildHomePostCardHTML).join("\n");
        section.style.display = "";
    }

    // Cria (se ainda não existir) e preenche a seção "Últimas postagens"
    // no rodapé da home, com até 10 cards no mesmo formato usado nas
    // páginas de categoria (.post-grid > .post-card).
    function ensureHomeLatestPostsSection(doc, items) {
        let grid = doc.getElementById("home-latest-posts-grid");

        if (!grid) {
            const section = doc.createElement("section");
            section.id = "home-latest-posts-section";
            const container = doc.createElement("div");
            container.className = "container";
            container.innerHTML = `<div class="section-title-wrap">
                <div>
                    <span class="section-eyebrow">// Tudo por aqui</span>
                    <h2 class="section-title">Últimas postagens</h2>
                </div>
            </div>
            <div class="post-grid" id="home-latest-posts-grid"></div>`;
            section.appendChild(container);

            // Insere antes da seção "Categorias" quando ela existir;
            // caso contrário, no fim do main.
            const categoriesHeading = Array.from(doc.querySelectorAll(".section-title"))
                .find(el => el.textContent.trim() === "Categorias");
            const categoriesSection = categoriesHeading ? categoriesHeading.closest("section") : null;
            const main = doc.querySelector("main#conteudo");

            if (categoriesSection && categoriesSection.parentNode) {
                categoriesSection.parentNode.insertBefore(section, categoriesSection);
            } else if (main) {
                main.appendChild(section);
            }

            grid = doc.getElementById("home-latest-posts-grid");
        }

        if (!grid) return;
        grid.innerHTML = items.map(buildHomePostCardHTML).join("\n");
    }

    // sortedPosts: array de posts (formato salvo no posts.json) já
    // ordenados do mais recente pro mais antigo.
    function updateHomeIndexHTML(currentHtml, sortedPosts) {
        if (!Array.isArray(sortedPosts) || !sortedPosts.length) return null;

        const parser = new DOMParser();
        const doc = parser.parseFromString(currentHtml, "text/html");
        const main = doc.querySelector("main#conteudo");
        if (!main) return null;

        const latest = sortedPosts.slice(0, 8);
        const top = latest[0];

        // Destaque grande do topo (hero) — sempre o artigo mais recente.
        const heroSection = doc.querySelector(".hero");
        if (heroSection) {
            const heroCover = heroSection.querySelector(".hero-cover");
            const heroCategory = heroSection.querySelector(".hero-category");
            const heroTitle = heroSection.querySelector("h1");
            const heroText = heroSection.querySelector(".hero-info p");
            const heroMainBtn = heroSection.querySelector(".hero-buttons .btn");
            if (heroCover) {
                const img = coverOf(top);
                if (img) {
                    heroCover.style.backgroundImage = `url('${img}')`;
                } else {
                    heroCover.removeAttribute("style");
                }
            }
            if (heroCategory) heroCategory.textContent = `🔥 ${top.categoria}`;
            if (heroTitle) heroTitle.textContent = top.titulo;
            if (heroText) heroText.textContent = top.resumo || plainTextExcerpt(top.conteudo);
            if (heroMainBtn) heroMainBtn.setAttribute("href", top.url);
        }

        // Bloco "Últimas notícias" — mostra APENAS posts da categoria
        // "Notícias" (destaque + 3 laterais + até 4 no grid). Cada seção
        // da home deve refletir a própria categoria, não a mistura de todas.
        const newsGrid = doc.getElementById("home-news-grid");
        const latestGrid = doc.getElementById("home-latest-grid");
        const newsSection = newsGrid ? newsGrid.closest("section") : null;
        const noticiasPosts = sortedPosts.filter(p => p.categoria === "Notícias");

        if (newsGrid) {
            if (!noticiasPosts.length) {
                newsGrid.innerHTML = "";
                if (latestGrid) { latestGrid.innerHTML = ""; latestGrid.style.display = "none"; }
                if (newsSection) newsSection.style.display = "none";
            } else {
                const [feature, ...rest] = noticiasPosts;
                const sideItems = rest.slice(0, 3);
                const gridItems = rest.slice(3, 7);

                newsGrid.innerHTML = `${buildHomeFeatureHTML(feature)}
            <div class="news-side">
                ${sideItems.map(buildHomeMiniCardHTML).join("\n")}
            </div>`;
                newsGrid.removeAttribute("data-fallback");
                if (newsSection) newsSection.style.display = "";

                if (latestGrid) {
                    if (gridItems.length) {
                        latestGrid.innerHTML = gridItems.map(buildHomePostCardHTML).join("\n");
                        latestGrid.style.display = "";
                    } else {
                        latestGrid.innerHTML = "";
                        latestGrid.style.display = "none";
                    }
                }
            }
        }

        // Seções por categoria — cada uma mostra somente as próprias
        // últimas postagens (a home nunca mistura categorias aqui).
        fillHomeCategorySection(
            doc, "home-marvel-section", "home-marvel-grid",
            sortedPosts.filter(p => p.categoria === "Marvel").slice(0, 3)
        );
        fillHomeCategorySection(
            doc, "home-dc-section", "home-dc-grid",
            sortedPosts.filter(p => p.categoria === "DC").slice(0, 3)
        );
        fillHomeCategorySection(
            doc, "home-tecnologia-section", "home-tecnologia-grid",
            sortedPosts.filter(p => p.categoria === "Tecnologia").slice(0, 3)
        );
        fillHomeCategorySection(
            doc, "home-ficcao-section", "home-ficcao-grid",
            sortedPosts.filter(p => p.categoria === "Ficção Científica").slice(0, 3)
        );
        fillHomeCategorySection(
            doc, "home-reviews-section", "home-reviews-grid",
            sortedPosts.filter(p => p.categoria === "Reviews").slice(0, 3)
        );

        // Bloco "Últimas postagens" — sempre as 10 mais recentes de
        // qualquer categoria, no mesmo estilo de card usado nas páginas
        // de categoria (post-grid / post-card).
        ensureHomeLatestPostsSection(doc, sortedPosts.slice(0, 10));

        return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
    }

    return {
        CATEGORIES: NERDX_CATEGORIES,
        slugify,
        contentToHtml,
        plainTextExcerpt,
        readImageAsDataURL,
        fetchExistingJSON,
        todayISO,
        buildArticleHTML,
        updateCategoryIndexHTML,
        removeCategoryCard,
        updateHomeIndexHTML
    };
})();
