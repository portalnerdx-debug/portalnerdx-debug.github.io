/* =========================================================
   HOME FEED — puxa os artigos publicados (api/posts.json)
   e preenche cada seção da home com as últimas postagens da
   PRÓPRIA categoria (Notícias, Marvel, DC, Tecnologia, Ficção
   Científica e Reviews nunca se misturam entre si).
   Se não houver nenhum post publicado ainda, a home mantém o
   conteúdo estático de exemplo.
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    let posts;
    try {
        const res = await fetch(`api/posts.json?v=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const text = await res.text();
        if (!text.trim()) return;
        posts = JSON.parse(text);
    } catch (e) {
        return;
    }
    if (!Array.isArray(posts) || !posts.length) return;

    const TAG_CLASS = {
        "Notícias": "noticias", "Marvel": "marvel", "DC": "dc",
        "Tecnologia": "tech", "Ficção Científica": "scifi", "Reviews": "reviews"
    };

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
                <h3><a href="${post.url}">${escapeHtml(post.titulo)}</a></h3>
                <p>${escapeHtml(post.resumo)}</p>
                <div class="post-meta"><span>✍️ ${escapeHtml(post.autor || "Nerd-X")}</span><span>📅 ${post.data}</span></div>
            </div>
        </article>`;
    }

    // Ordena TODOS os posts (de qualquer categoria) do mais recente para o mais antigo.
    const sorted = posts.slice().sort((a, b) => parseDate(b.data) - parseDate(a.data));

    // Os 8 artigos mais recentes do site inteiro (usados só no hero e na
    // seção genérica "Últimas postagens" lá embaixo, que junta tudo).
    const latest = sorted.slice(0, 8);

    // Destaque grande do topo (hero) — sempre o artigo mais recente do site.
    const heroSection = document.querySelector(".hero");
    if (heroSection && latest.length) {
        const top = latest[0];
        const heroCover = heroSection.querySelector(".hero-cover");
        const heroCategory = heroSection.querySelector(".hero-category");
        const heroTitle = heroSection.querySelector("h1");
        const heroText = heroSection.querySelector(".hero-info p");
        const heroMainBtn = heroSection.querySelector(".hero-buttons .btn");
        if (heroCover) {
            if (top.imagem) {
                heroCover.style.backgroundImage = `url('${top.imagem}')`;
            } else {
                heroCover.removeAttribute("style");
            }
        }
        if (heroCategory) heroCategory.textContent = `🔥 ${top.categoria}`;
        if (heroTitle) heroTitle.textContent = top.titulo;
        if (heroText) heroText.textContent = top.resumo;
        if (heroMainBtn) heroMainBtn.setAttribute("href", top.url);
    }

    // Bloco "Últimas notícias" — mostra SOMENTE posts da categoria
    // "Notícias" (destaque + 3 laterais + até 4 no grid extra).
    const newsGrid = document.getElementById("home-news-grid");
    const latestGrid = document.getElementById("home-latest-grid");
    const newsSection = newsGrid ? newsGrid.closest("section") : null;
    const noticiasPosts = sorted.filter(p => p.categoria === "Notícias");

    if (newsGrid) {
        if (!noticiasPosts.length) {
            newsGrid.innerHTML = "";
            if (latestGrid) { latestGrid.innerHTML = ""; latestGrid.style.display = "none"; }
            if (newsSection) newsSection.style.display = "none";
        } else {
            const [feature, ...rest] = noticiasPosts;
            const sideItems = rest.slice(0, 3);
            const gridItems = rest.slice(3, 7);

            const tag = TAG_CLASS[feature.categoria] || "noticias";
            const featureImg = feature.imagem ? ` style="background-image:url('${feature.imagem}');background-size:cover;background-position:center;"` : "";
            newsGrid.innerHTML = `
                <article class="news-feature" data-animate>
                    <div class="news-image"${featureImg}></div>
                    <div class="news-content">
                        <span class="tag ${tag}">${escapeHtml(feature.categoria)}</span>
                        <h3>${escapeHtml(feature.titulo)}</h3>
                        <p>${escapeHtml(feature.resumo)}</p>
                        <a href="${feature.url}" class="read-more">Leia mais →</a>
                    </div>
                </article>
                <div class="news-side">
                    ${sideItems.map(p => `<article class="mini-card" data-animate>
                        <span class="tag ${TAG_CLASS[p.categoria] || "noticias"}">${escapeHtml(p.categoria)}</span>
                        <h4><a href="${p.url}">${escapeHtml(p.titulo)}</a></h4>
                    </article>`).join("")}
                </div>
            `;
            if (newsSection) newsSection.style.display = "";

            if (latestGrid) {
                if (gridItems.length) {
                    latestGrid.innerHTML = gridItems.map(postCard).join("");
                    latestGrid.style.display = "";
                } else {
                    latestGrid.innerHTML = "";
                    latestGrid.style.display = "none";
                }
            }
        }
    }

    // Seções por categoria (Marvel, DC, Tecnologia, Ficção Científica e
    // Reviews) — cada uma mostra somente as próprias últimas postagens.
    // A seção some sozinha quando a categoria ainda não tem nada publicado.
    function fillCategorySection(categoriaLabel, sectionId, gridId) {
        const items = sorted.filter(p => p.categoria === categoriaLabel).slice(0, 3);
        const section = document.getElementById(sectionId);
        const grid = document.getElementById(gridId);
        if (!section || !grid) return;
        if (!items.length) {
            grid.innerHTML = "";
            section.style.display = "none";
            return;
        }
        grid.innerHTML = items.map(postCard).join("");
        section.style.display = "";
    }

    fillCategorySection("Marvel", "home-marvel-section", "home-marvel-grid");
    fillCategorySection("DC", "home-dc-section", "home-dc-grid");
    fillCategorySection("Tecnologia", "home-tecnologia-section", "home-tecnologia-grid");
    fillCategorySection("Ficção Científica", "home-ficcao-section", "home-ficcao-grid");
    fillCategorySection("Reviews", "home-reviews-section", "home-reviews-grid");

    // Bloco "Últimas postagens" (rodapé da home) — junta as 10 mais
    // recentes de QUALQUER categoria. O painel admin cria/atualiza esse
    // bloco no HTML estático na hora de publicar, mas até agora esta
    // página não sabia atualizá-lo sozinha: se o index.html publicado
    // não fosse resubido certinho depois de excluir/editar um artigo,
    // os cards antigos ficavam presos aqui pra sempre. Agora ele também
    // fica em sincronia direta com o api/posts.json, igual as outras
    // seções acima.
    (function fillHomeLatestPostsSection() {
        const items = sorted.slice(0, 10);
        let section = document.getElementById("home-latest-posts-section");
        let grid = document.getElementById("home-latest-posts-grid");

        if (!items.length) {
            if (grid) grid.innerHTML = "";
            if (section) section.style.display = "none";
            return;
        }

        if (!grid) {
            // Primeira vez que existem posts o suficiente pra essa seção
            // aparecer e ela ainda não foi criada no HTML — cria do zero.
            const main = document.getElementById("conteudo");
            if (!main) return;

            section = document.createElement("section");
            section.id = "home-latest-posts-section";
            const container = document.createElement("div");
            container.className = "container";
            container.innerHTML = `<div class="section-title-wrap">
                <div>
                    <span class="section-eyebrow">// Tudo por aqui</span>
                    <h2 class="section-title">Últimas postagens</h2>
                </div>
            </div>
            <div class="post-grid" id="home-latest-posts-grid"></div>`;
            section.appendChild(container);

            const categoriesHeading = Array.from(main.querySelectorAll(".section-title"))
                .find(el => el.textContent.trim() === "Categorias");
            const categoriesSection = categoriesHeading ? categoriesHeading.closest("section") : null;
            if (categoriesSection && categoriesSection.parentNode) {
                categoriesSection.parentNode.insertBefore(section, categoriesSection);
            } else {
                main.appendChild(section);
            }
            grid = document.getElementById("home-latest-posts-grid");
        }

        grid.innerHTML = items.map(postCard).join("");
        section.style.display = "";
    })();
});
