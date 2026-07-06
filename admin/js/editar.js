const list = document.getElementById("postList");
const status = document.getElementById("status");
const bulkToolbar = document.getElementById("bulkToolbar");
const selectAllCheckbox = document.getElementById("selectAll");
const selectedCountEl = document.getElementById("selectedCount");
const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");

let currentPosts = [];        // array cru vindo do posts.json (índice original = posição nesse array)
let selectedIndexes = new Set();

function showStatus(type, html) {
    status.className = "status-box " + type;
    status.innerHTML = html;
    status.style.display = "block";
}

function downloadBlob(filename, blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function updateBulkToolbar() {
    const total = currentPosts.length;
    const selected = selectedIndexes.size;
    selectedCountEl.textContent = `${selected} selecionado${selected === 1 ? "" : "s"}`;
    bulkDeleteBtn.disabled = selected === 0;
    selectAllCheckbox.checked = total > 0 && selected === total;
    selectAllCheckbox.indeterminate = selected > 0 && selected < total;
}

async function loadPosts() {
    const posts = await NerdxPublish.fetchExistingJSON("../api/posts.json", []);
    currentPosts = Array.isArray(posts) ? posts : [];
    selectedIndexes = new Set();

    if (!currentPosts.length) {
        bulkToolbar.style.display = "none";
        list.innerHTML = `<p style="color:var(--text2);">Nenhum artigo encontrado em <code>api/posts.json</code>. Publique um artigo em "Novo Artigo" primeiro.</p>`;
        return;
    }

    bulkToolbar.style.display = "flex";

    const sortedPosts = currentPosts
        .map((post, originalIndex) => ({ post, originalIndex }))
        .sort((a, b) => (Date.parse(b.post.data) || 0) - (Date.parse(a.post.data) || 0));

    list.innerHTML = "";
    sortedPosts.forEach(({ post, originalIndex: index }) => {
        const row = document.createElement("div");
        row.className = "recent-post post-row";
        row.innerHTML = `
            <div class="post-row-main">
                <input type="checkbox" class="post-row-check" data-index="${index}">
                <div>
                    <h3>${post.titulo}</h3>
                    <small>${post.categoria} • ${post.data} • ${post.autor || "Nerd-X"}</small>
                </div>
            </div>
            <div class="post-row-actions">
                <a class="button secondary" href="../${post.url}" target="_blank" rel="noopener">Ver</a>
                <button class="button danger" data-index="${index}">Excluir</button>
            </div>
        `;
        list.appendChild(row);
    });

    list.querySelectorAll(".post-row-check").forEach(cb => {
        cb.addEventListener("change", () => {
            const index = Number(cb.dataset.index);
            if (cb.checked) selectedIndexes.add(index);
            else selectedIndexes.delete(index);
            updateBulkToolbar();
        });
    });

    list.querySelectorAll("button.button.danger[data-index]").forEach(btn => {
        btn.addEventListener("click", () => {
            const index = Number(btn.dataset.index);
            const post = currentPosts[index];
            if (!post) return;
            if (!confirm(`Remover "${post.titulo}" da lista e da categoria?`)) return;
            removePosts([index]);
        });
    });

    updateBulkToolbar();
}

selectAllCheckbox.addEventListener("change", () => {
    if (selectAllCheckbox.checked) {
        currentPosts.forEach((_, index) => selectedIndexes.add(index));
    } else {
        selectedIndexes.clear();
    }
    list.querySelectorAll(".post-row-check").forEach(cb => {
        cb.checked = selectedIndexes.has(Number(cb.dataset.index));
    });
    updateBulkToolbar();
});

bulkDeleteBtn.addEventListener("click", () => {
    const indexes = Array.from(selectedIndexes);
    if (!indexes.length) return;
    const titles = indexes.map(i => currentPosts[i]?.titulo).filter(Boolean);
    const preview = titles.slice(0, 5).map(t => `• ${t}`).join("\n") + (titles.length > 5 ? `\n… e mais ${titles.length - 5}` : "");
    if (!confirm(`Remover ${indexes.length} artigo(s) da lista e das categorias?\n\n${preview}`)) return;
    removePosts(indexes);
});

// Remove um ou vários posts de uma vez (usado tanto pelo botão "Excluir"
// de uma linha quanto pela exclusão em lote). Gera um único .zip com o
// api/posts.json atualizado, a(s) página(s) de categoria afetada(s) e a
// home, todos já sem os artigos removidos.
async function removePosts(indexes) {
    const toRemove = indexes
        .map(i => ({ index: i, post: currentPosts[i] }))
        .filter(item => !!item.post);
    if (!toRemove.length) return;

    const originalBtnHtml = bulkDeleteBtn.innerHTML;
    bulkDeleteBtn.disabled = true;
    bulkDeleteBtn.textContent = "Removendo...";

    try {
        const removeSet = new Set(toRemove.map(item => item.index));
        const updatedPosts = currentPosts.filter((_, i) => !removeSet.has(i));

        // Agrupa os posts removidos por categoria, pra mexer em cada
        // página de categoria só uma vez, removendo todos os cards dela.
        const bySlug = new Map();
        toRemove.forEach(({ post }) => {
            if (!bySlug.has(post.categoriaSlug)) bySlug.set(post.categoriaSlug, []);
            bySlug.get(post.categoriaSlug).push(post);
        });

        const zip = new JSZip();
        const updatedCategoryFiles = [];
        const failedCategoryFiles = [];

        for (const [categoriaSlug, postsInCategory] of bySlug.entries()) {
            const categoryPath = `../categorias/${categoriaSlug}/index.html`;
            let categoryHtml = await fetch(`${categoryPath}?v=${Date.now()}`, { cache: "no-store" })
                .then(r => (r.ok ? r.text() : null))
                .catch(() => null);

            if (!categoryHtml) {
                failedCategoryFiles.push(categoriaSlug);
                continue;
            }

            postsInCategory.forEach(post => {
                categoryHtml = NerdxPublish.removeCategoryCard(categoryHtml, post.slug);
            });

            zip.file(`categorias/${categoriaSlug}/index.html`, categoryHtml);
            updatedCategoryFiles.push(categoriaSlug);
        }

        const sortedPosts = updatedPosts.slice().sort(
            (a, b) => (Date.parse(b.data) || 0) - (Date.parse(a.data) || 0)
        );
        const currentHomeHtml = await fetch(`../index.html?v=${Date.now()}`, { cache: "no-store" })
            .then(r => (r.ok ? r.text() : null))
            .catch(() => null);
        const updatedHomeHtml = currentHomeHtml
            ? NerdxPublish.updateHomeIndexHTML(currentHomeHtml, sortedPosts)
            : null;

        zip.file("api/posts.json", JSON.stringify(updatedPosts, null, 2));
        if (updatedHomeHtml) {
            zip.file("index.html", updatedHomeHtml);
        }

        const blob = await zip.generateAsync({ type: "blob" });
        const filename = toRemove.length === 1
            ? `nerdx-remover-${toRemove[0].post.slug}.zip`
            : `nerdx-remover-${toRemove.length}-artigos.zip`;
        downloadBlob(filename, blob);

        showStatus("success", `
            <strong>Pronto.</strong> Removi ${toRemove.length} artigo(s) e baixei <code>${filename}</code> com:
            <ul>
                <li><code>api/posts.json</code> atualizado (sem ${toRemove.length === 1 ? "o artigo removido" : "os artigos removidos"})</li>
                ${updatedCategoryFiles.map(slug => `<li><code>categorias/${slug}/index.html</code> — cards removidos dessa categoria</li>`).join("")}
                ${failedCategoryFiles.length
                    ? `<li><em>Não consegui carregar a página atual de: ${failedCategoryFiles.join(", ")} (rode isso no site publicado, não localmente) — sem problema, é só subir o <code>api/posts.json</code> atualizado: a própria página de categoria busca a lista certa sozinha e vai parar de mostrar os artigos removidos.</em></li>`
                    : ""}
                ${updatedHomeHtml ? `<li><code>index.html</code> — a home, sem os artigos removidos</li>` : ""}
            </ul>
            <p><strong>Para aplicar de verdade:</strong> extraia o zip e suba esses arquivos para o seu repositório do GitHub (substituindo os existentes), depois faça commit e push.</p>
            <p>Os arquivos <code>.html</code> dos artigos em si não são apagados — se quiser, delete-os manualmente no GitHub: ${toRemove.map(({ post }) => `<code>categorias/${post.categoriaSlug}/${post.slug}.html</code>`).join(", ")}.</p>
        `);
    } catch (err) {
        console.error(err);
        showStatus("error", "Algo deu errado ao remover os artigos: " + err.message);
    } finally {
        bulkDeleteBtn.innerHTML = originalBtnHtml;
        loadPosts();
    }
}

loadPosts();
