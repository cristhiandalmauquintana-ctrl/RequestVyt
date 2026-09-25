const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'public')));

// Middleware del Proxy para Invidious
app.use('/proxy', (req, res, next) => {
    // Tomamos la URL destino desde un query param, ej: /proxy?url=https://yewtu.be/search?q=test
    const targetUrl = req.query.url || 'https://yewtu.be';
    
    try {
        const parsedUrl = new URL(targetUrl);
        const proxy = createProxyMiddleware({
            target: parsedUrl.origin,
            changeOrigin: true,
            pathRewrite: (path, req) => {
                const u = new URL(req.url, 'http://localhost');
                u.searchParams.delete('url'); // Eliminamos el parámetro 'url' para no reenviarlo a Invidious
                return u.pathname + u.search;
            },
            onProxyRes: (proxyRes) => {
                // EL TRUCO CLAVE: Eliminamos las cabeceras que prohíben el iframe
                delete proxyRes.headers['x-frame-options'];
                delete proxyRes.headers['content-security-policy'];
                delete proxyRes.headers['frame-options'];
            },
            onError: (err, req, res) => {
                res.status(500).send('Error al conectar con la instancia de Invidious.');
            }
        });
        return proxy(req, res, next);
    } catch (e) {
        return res.status(400).send('URL de proxy inválida');
    }
});

// Ruta principal
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor proxy corriendo en el puerto ${PORT}`);
});
