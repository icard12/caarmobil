import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
    onNeedRefresh() {
        if (confirm('Nova versão disponível! Deseja atualizar?')) {
            updateSW(true);
        }
    },
    onOfflineReady() {
        console.log('O app está pronto para ser usado offline!');
    },
});
