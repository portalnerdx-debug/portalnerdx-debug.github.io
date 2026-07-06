/* ================= NEWSLETTER: validação + feedback ================= */
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".newsletter-form").forEach((form) => {
        const feedback = form.parentElement.querySelector(".form-feedback") || (() => {
            const p = document.createElement("p");
            p.className = "form-feedback";
            form.after(p);
            return p;
        })();

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = form.querySelector('input[type="email"]');
            const email = input.value.trim();
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

            if (!isValid) {
                feedback.textContent = "Digite um e-mail válido para continuar.";
                feedback.className = "form-feedback error";
                input.focus();
                return;
            }

            // Integração real (Mailchimp, Resend etc.) entra aqui.
            feedback.textContent = "Inscrição confirmada! Bem-vindo ao Nerd X. 🚀";
            feedback.className = "form-feedback success";
            form.reset();
        });
    });
});
