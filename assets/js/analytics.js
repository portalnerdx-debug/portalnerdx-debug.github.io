/* =========================================================
   ANALYTICS — stub.
   Substitua pelo snippet real (Plausible, GA4, Umami...)
   e mantenha este arquivo como único ponto de entrada, para
   trocar de provedor sem editar HTML em várias páginas.
   ========================================================= */
window.nerdxTrack = function (eventName, payload) {
    if (window.location.hostname === "localhost") {
        console.info("[analytics]", eventName, payload || {});
    }
    // Ex.: window.plausible && window.plausible(eventName, { props: payload });
};
