# Maqueta 3D del inicio

`js/escena3d.js` es la versión compilada de `dev/escena3d.src.js` (Three.js 0.186).
El sitio no necesita compilar nada para publicarse: sólo hay que recompilar si se
modifica la maqueta.

```bash
npm install three@0.186.1 esbuild
npx esbuild dev/escena3d.src.js --bundle --minify --format=iife --target=es2019 \
  --legal-comments=none --outfile=js/escena3d.js
```

- La maqueta se carga sola desde `js/site.js` cuando el navegador tiene WebGL.
- Sin WebGL, con ahorro de datos o sin JavaScript se muestra la imagen fija
  `assets/img/maqueta/maqueta.webp`.
- Con «reducir movimiento» activado la maqueta queda quieta.
