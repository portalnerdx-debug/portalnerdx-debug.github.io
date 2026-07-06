const form = document.getElementById("configForm");
const status = document.getElementById("status");

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

async function loadCurrent() {
    const config = await NerdxPublish.fetchExistingJSON("../data/configuracao.json", {});
    const social = await NerdxPublish.fetchExistingJSON("../data/social.json", {});

    if (config.siteTitle) document.getElementById("siteTitle").value = config.siteTitle;
    if (config.siteDescription) document.getElementById("siteDescription").value = config.siteDescription;
    if (social.instagram) document.getElementById("instagram").value = social.instagram;
    if (social.twitter) document.getElementById("twitter").value = social.twitter;
    if (social.youtube) document.getElementById("youtube").value = social.youtube;
    if (social.discord) document.getElementById("discord").value = social.discord;
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const config = {
        siteTitle: document.getElementById("siteTitle").value.trim(),
        siteDescription: document.getElementById("siteDescription").value.trim()
    };
    const social = {
        instagram: document.getElementById("instagram").value.trim(),
        twitter: document.getElementById("twitter").value.trim(),
        youtube: document.getElementById("youtube").value.trim(),
        discord: document.getElementById("discord").value.trim()
    };

    const zip = new JSZip();
    zip.file("data/configuracao.json", JSON.stringify(config, null, 2));
    zip.file("data/social.json", JSON.stringify(social, null, 2));
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob("nerdx-configuracao.zip", blob);

    showStatus("success", `
        <strong>Configurações geradas.</strong>
        <p>Baixei <code>nerdx-configuracao.zip</code> com <code>data/configuracao.json</code> e <code>data/social.json</code> atualizados.</p>
        <p><em>Nota:</em> esses arquivos ainda não são lidos automaticamente pelas páginas do site (elas têm o texto do rodapé/topo escrito direto no HTML). Isso guarda os dados para uso futuro; para refletir agora, ajuste manualmente o texto no HTML ou peça pra eu conectar essas páginas a estes arquivos.</p>
    `);
});

loadCurrent();
