const titulo = document.getElementById("titulo");
const slug = document.getElementById("slug");
const form = document.getElementById("postForm");
const status = document.getElementById("status");
const imagemInput = document.getElementById("imagem");
const preview = document.getElementById("imagemPreview");
const submitBtn = form.querySelector("button[type=submit]");

let slugEditedManually = false;

titulo.addEventListener("input", () => {
    if (slugEditedManually) return;
    slug.value = NerdxPublish.slugify(titulo.value);
});

slug.addEventListener("input", () => { slugEditedManually = true; });

imagemInput.addEventListener("change", async () => {
    const file = imagemInput.files[0];
    if (!file) { preview.innerHTML = ""; return; }
    const dataUrl = await NerdxPublish.readImageAsDataURL(file);
    preview.innerHTML = `<img src="${dataUrl}" alt="Pré-visualização da capa">`;
});

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

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const categoriaLabel = document.getElementById("categoria").value;
    const cat = NerdxPublish.CATEGORIES[categoriaLabel];
    const tituloVal = titulo.value.trim();
    const slugVal = (slug.value || NerdxPublish.slugify(tituloVal)).trim();
    const conteudoVal = document.getElementById("conteudo").value.trim();

    if (!tituloVal || !slugVal || !conteudoVal || !cat) {
        showStatus("error", "Preencha pelo menos <strong>título</strong>, <strong>categoria</strong> e <strong>conteúdo</strong> antes de publicar.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Gerando artigo...";

    try {
        const imagemFile = imagemInput.files[0] || null;
        const imagemDataUrl = imagemFile ? await NerdxPublish.readImageAsDataURL(imagemFile) : null;

        const post = {
            titulo: tituloVal,
            slug: slugVal,
            categoria: categoriaLabel,
            categoriaSlug: cat.slug,
            categoriaTag: cat.tag,
            autor: document.getElementById("autor").value.trim() || "Nerd-X",
            resumo: document.getElementById("descricao").value.trim(),
            conteudo: conteudoVal,
            seoTitle: document.getElementById("seoTitle").value.trim(),
            seoDescription: document.getElementById("seoDescription").value.trim(),
            data: NerdxPublish.todayISO(),
            imagemDataUrl
        };
        post.conteudoHtml = NerdxPublish.contentToHtml(post.conteudo);

        // 1) Página do artigo
        const articleHtml = NerdxPublish.buildArticleHTML(post);

        // 2) Página da categoria, atualizada com o novo card
        const categoryPath = `../categorias/${post.categoriaSlug}/index.html`;
        const currentCategoryHtml = await fetch(`${categoryPath}?v=${Date.now()}`, { cache: "no-store" })
            .then(r => (r.ok ? r.text() : null))
            .catch(() => null);
        const updatedCategoryHtml = currentCategoryHtml
            ? NerdxPublish.updateCategoryIndexHTML(currentCategoryHtml, post)
            : null;

        // 3) posts.json atualizado
        const existingPosts = await NerdxPublish.fetchExistingJSON("../api/posts.json", []);
        const postsArray = Array.isArray(existingPosts) ? existingPosts : [];
        postsArray.unshift({
            titulo: post.titulo,
            slug: post.slug,
            categoria: post.categoria,
            categoriaSlug: post.categoriaSlug,
            autor: post.autor,
            data: post.data,
            resumo: post.resumo,
            url: `categorias/${post.categoriaSlug}/${post.slug}.html`,
            imagem: post.imagemDataUrl || null
        });

        // 4) Home (index.html), com o destaque e os cards das últimas
        // postagens atualizados — igual à página da categoria.
        const sortedPosts = postsArray.slice().sort(
            (a, b) => (Date.parse(b.data) || 0) - (Date.parse(a.data) || 0)
        );
        const currentHomeHtml = await fetch(`../index.html?v=${Date.now()}`, { cache: "no-store" })
            .then(r => (r.ok ? r.text() : null))
            .catch(() => null);
        const updatedHomeHtml = currentHomeHtml
            ? NerdxPublish.updateHomeIndexHTML(currentHomeHtml, sortedPosts)
            : null;

        // Empacota tudo em um .zip
        const zip = new JSZip();
        zip.file(`categorias/${post.categoriaSlug}/${post.slug}.html`, articleHtml);
        if (updatedCategoryHtml) {
            zip.file(`categorias/${post.categoriaSlug}/index.html`, updatedCategoryHtml);
        }
        if (updatedHomeHtml) {
            zip.file("index.html", updatedHomeHtml);
        }
        zip.file("api/posts.json", JSON.stringify(postsArray, null, 2));

        const blob = await zip.generateAsync({ type: "blob" });
        downloadBlob(`nerdx-artigo-${post.slug}.zip`, blob);

        showStatus("success", `
            <strong>Artigo gerado com sucesso!</strong>
            <p>Baixei um arquivo <code>nerdx-artigo-${post.slug}.zip</code> com:</p>
            <ul>
                <li><code>categorias/${post.categoriaSlug}/${post.slug}.html</code> — a página do artigo</li>
                ${updatedCategoryHtml
                    ? `<li><code>categorias/${post.categoriaSlug}/index.html</code> — a página da categoria, já com o novo artigo listado</li>`
                    : `<li><em>Não consegui carregar a página atual da categoria (rode isso no site publicado, não localmente) — envie o artigo e adicione o card na categoria manualmente.</em></li>`}
                ${updatedHomeHtml
                    ? `<li><code>index.html</code> — a home, com o destaque e os cards das últimas postagens atualizados</li>`
                    : `<li><em>Não consegui carregar a home atual (rode isso no site publicado, não localmente) — o destaque da home não foi atualizado.</em></li>`}
                <li><code>api/posts.json</code> — lista de artigos atualizada</li>
            </ul>
            <p><strong>Para publicar de verdade:</strong> extraia o zip e suba esses arquivos para o seu repositório do GitHub (substituindo os existentes), depois faça commit e push. O GitHub Pages atualiza o site em 1–2 minutos.</p>
        `);
        form.reset();
        slug.value = "";
        slugEditedManually = false;
        preview.innerHTML = "";
    } catch (err) {
        console.error(err);
        showStatus("error", "Algo deu errado ao gerar o artigo: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Publicar Artigo";
    }
});
