// Runs in the page MAIN world at document_start (see manifest), before Plex’s own
// listeners register, so this capture handler runs first on Escape.
// Isolated extension code adds `.char-mining-img-modal` to the shared DOM; we only
// preventDefault so the browser does not exit fullscreen before the extension closes the modal.
(function () {
    window.addEventListener(
        'keydown',
        function miningImageModalSuppressFullscreenEsc(ev) {
            if (ev.key !== 'Escape') return;
            try {
                if (!document.querySelector('.char-mining-img-modal')) return;
            } catch {
                return;
            }
            ev.preventDefault();
        },
        true
    );
})();
