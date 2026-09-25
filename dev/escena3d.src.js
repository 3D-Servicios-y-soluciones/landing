/*!
 * 3D Group | Maqueta 3D del inicio.
 * Una manzana en blanco, como maqueta de arquitectura, con los cinco tipos de
 * recinto que atendemos. Al pasar el cursor (o tocar) un edificio se destaca y
 * enlaza a su página. Fuente legible de js/escena3d.js; se compila con
 * esbuild (ver dev/LEEME.md).
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, BoxGeometry,
  MeshStandardMaterial, HemisphereLight, DirectionalLight, PlaneGeometry,
  ShadowMaterial, EdgesGeometry, LineSegments, LineBasicMaterial,
  BufferGeometry, Float32BufferAttribute, Color, InstancedMesh, Object3D,
  IcosahedronGeometry, CylinderGeometry, VSMShadowMap, SRGBColorSpace,
  Vector3, Raycaster, Vector2, Shape, ExtrudeGeometry, Box3
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const NAVY = new Color('#27367B');
const NAVY_LUZ = new Color('#1A2457'); // más oscuro: con la luz se ve como el navy de marca
const CELESTE = new Color('#78ACDC');
const BLANCO = new Color('#FFFFFF');

/* ------------------------------------------------------------------ */
/* Utilidades de geometría                                              */
/* ------------------------------------------------------------------ */

/** Segmentos de línea a partir de una lista plana [x1,y1,z1,x2,y2,z2,...]. */
function lineas(puntos, material) {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(puntos, 3));
  return new LineSegments(g, material);
}

/** Caja con la base en y = 0, centrada en x/z. */
function caja(w, h, d, mat) {
  const g = new BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  const m = new Mesh(g, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function bordes(mesh, material) {
  const l = new LineSegments(new EdgesGeometry(mesh.geometry, 20), material);
  l.position.copy(mesh.position);
  l.rotation.copy(mesh.rotation);
  return l;
}

/**
 * Líneas de fachada: pisos (horizontales) y montantes (verticales) sobre las
 * cuatro caras de una caja w x h x d con base en y = 0.
 */
function fachada(w, h, d, { pisos = 0, montantes = 0, caras = 'nsew', desde = 0, hasta = null } = {}) {
  const p = [];
  const x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2;
  const e = 0.02; // leve separación para evitar z-fighting
  const top = hasta === null ? h : hasta;
  const caraN = caras.includes('n'), caraS = caras.includes('s');
  const caraE = caras.includes('e'), caraW = caras.includes('w');
  if (pisos > 0) {
    for (let y = desde + pisos; y < top - 0.01; y += pisos) {
      if (caraS) p.push(x0, y, z1 + e, x1, y, z1 + e);
      if (caraN) p.push(x0, y, z0 - e, x1, y, z0 - e);
      if (caraE) p.push(x1 + e, y, z0, x1 + e, y, z1);
      if (caraW) p.push(x0 - e, y, z0, x0 - e, y, z1);
    }
  }
  if (montantes > 0) {
    const nx = Math.max(1, Math.round(w / montantes));
    const nz = Math.max(1, Math.round(d / montantes));
    for (let i = 1; i < nx; i++) {
      const x = x0 + (w * i) / nx;
      if (caraS) p.push(x, desde, z1 + e, x, top, z1 + e);
      if (caraN) p.push(x, desde, z0 - e, x, top, z0 - e);
    }
    for (let i = 1; i < nz; i++) {
      const z = z0 + (d * i) / nz;
      if (caraE) p.push(x1 + e, desde, z, x1 + e, top, z);
      if (caraW) p.push(x0 - e, desde, z, x0 - e, top, z);
    }
  }
  return p;
}

/**
 * Junta en una sola geometría todas las piezas de un grupo que comparten
 * material. Pasa de cientos de llamadas de dibujo a unas pocas, que es lo
 * que permite mover la maqueta con fluidez en un teléfono.
 */
function fusionar(grupo) {
  const porMaterial = new Map();
  grupo.updateMatrix();
  for (const hijo of [...grupo.children]) {
    if (hijo.isInstancedMesh) continue;
    if (!(hijo.isMesh || hijo.isLineSegments)) continue;
    hijo.updateMatrix();
    let g = hijo.geometry.clone().applyMatrix4(hijo.matrix);
    if (g.index) g = g.toNonIndexed();
    for (const nombre of Object.keys(g.attributes)) {
      if (nombre !== 'position' && nombre !== 'normal') g.deleteAttribute(nombre);
    }
    const clave = hijo.material.uuid + (hijo.isMesh ? ':m' : ':l');
    if (!porMaterial.has(clave)) porMaterial.set(clave, { material: hijo.material, malla: hijo.isMesh, lista: [] });
    porMaterial.get(clave).lista.push(g);
    grupo.remove(hijo);
  }
  for (const { material, malla, lista } of porMaterial.values()) {
    const g = mergeGeometries(lista, false);
    if (!g) continue;
    const o = malla ? new Mesh(g, material) : new LineSegments(g, material);
    if (malla) { o.castShadow = true; o.receiveShadow = true; }
    grupo.add(o);
  }
}

/* ------------------------------------------------------------------ */
/* Escena                                                               */
/* ------------------------------------------------------------------ */

function construir() {
  const escena = new Scene();
  const maqueta = new Group();
  escena.add(maqueta);

  const matBase = new MeshStandardMaterial({ color: '#F7F8FB', roughness: 0.95, metalness: 0 });
  const matCalle = new MeshStandardMaterial({ color: '#E6EAF1', roughness: 1, metalness: 0 });
  const matLineaSuave = new LineBasicMaterial({ color: NAVY, transparent: true, opacity: 0.16 });

  /* Zócalo de la maqueta */
  const zocalo = new Mesh(new BoxGeometry(66, 1.6, 50), matCalle);
  zocalo.position.y = -0.8;
  zocalo.receiveShadow = true;
  maqueta.add(zocalo);
  maqueta.add(bordes(zocalo, matLineaSuave));

  /* Manzanas (veredas levemente elevadas sobre la calle) */
  const manzanas = [
    [-16.5, -13.5, 29, 19],
    [18.5, -13.5, 23, 19],
    [-16.5, 13.5, 29, 19],
    [18.5, 13.5, 23, 19]
  ];
  for (const [x, z, w, d] of manzanas) {
    const m = caja(w, 0.35, d, matBase);
    m.position.set(x, 0, z);
    m.castShadow = false;
    maqueta.add(m);
    maqueta.add(bordes(m, matLineaSuave));
  }

  /* Edificios: cada uno con su material para poder destacarlo */
  const edificios = [];
  function edificio(clave, nombre) {
    const g = new Group();
    g.userData = { clave, nombre };
    const mat = new MeshStandardMaterial({ color: BLANCO.clone(), roughness: 0.9, metalness: 0 });
    const linea = new LineBasicMaterial({ color: NAVY.clone(), transparent: true, opacity: 0.5 });
    const detalle = new LineBasicMaterial({ color: NAVY.clone(), transparent: true, opacity: 0.22 });
    g.userData.mats = { mat, linea, detalle };
    edificios.push(g);
    maqueta.add(g);
    return g;
  }
  const Y0 = 0.35; // altura de la vereda

  /* Torre corporativa */
  {
    const g = edificio('edificios', 'Edificios corporativos');
    const { mat, linea, detalle } = g.userData.mats;
    const torre = caja(10, 33.6, 10, mat);
    const remate = caja(7.6, 2.2, 7.6, mat); remate.position.y = 33.6;
    const techo = caja(10.4, 0.35, 10.4, mat); techo.position.y = 33.6;
    const acceso = caja(6, 0.4, 2.4, mat); acceso.position.set(0, 3.4, 6.2);
    g.add(torre, remate, techo, acceso);
    g.add(bordes(torre, linea), bordes(remate, linea), bordes(techo, linea), bordes(acceso, linea));
    g.add(lineas(fachada(10, 33.6, 10, { pisos: 1.4, montantes: 1.25, desde: 4.2 }), detalle));
    g.position.set(-22, Y0, -15);
    g.userData.alto = 36;
  }

  /* Oficinas en altura media */
  {
    const g = edificio('oficinas', 'Oficinas y empresas');
    const { mat, linea, detalle } = g.userData.mats;
    const cuerpo = caja(13, 12.6, 9, mat);
    const coron = caja(13.4, 0.4, 9.4, mat); coron.position.y = 12.6;
    const sala = caja(4, 1.6, 3, mat); sala.position.set(-3, 13, -1);
    g.add(cuerpo, coron, sala);
    g.add(bordes(cuerpo, linea), bordes(coron, linea), bordes(sala, linea));
    g.add(lineas(fachada(13, 12.6, 9, { pisos: 3.15, montantes: 1.3 }), detalle));
    g.position.set(-6.5, Y0, -13);
    g.userData.alto = 15;
  }

  /* Condominio: dos bloques residenciales con balcones */
  {
    const g = edificio('condominios', 'Condominios');
    const { mat, linea, detalle } = g.userData.mats;
    const a = caja(18, 18.9, 6, mat); a.position.set(-1.5, 0, -4.5);
    const b = caja(6, 13.5, 9, mat); b.position.set(6, 0, 4.5);
    g.add(a, b);
    g.add(bordes(a, linea), bordes(b, linea));
    const pa = fachada(18, 18.9, 6, { pisos: 2.7, montantes: 2.25 });
    const pb = fachada(6, 13.5, 9, { pisos: 2.7, montantes: 2.25 });
    const la = lineas(pa, detalle); la.position.copy(a.position);
    const lb = lineas(pb, detalle); lb.position.copy(b.position);
    g.add(la, lb);
    // Balcones corridos: una losa delgada por piso, como bandas horizontales
    const bandas = [];
    for (let piso = 1; piso <= 6; piso++) {
      const l = caja(18.6, 0.24, 1.1, mat);
      l.position.set(-1.5, piso * 2.7 - 0.12, -4.5 + 3 + 0.55);
      bandas.push(l);
    }
    for (let piso = 1; piso <= 4; piso++) {
      const l = caja(1.1, 0.24, 9.6, mat);
      l.position.set(6 + 3 + 0.55, piso * 2.7 - 0.12, 4.5);
      bandas.push(l);
    }
    for (const l of bandas) g.add(l, bordes(l, linea));
    g.position.set(18.5, Y0, -14.5);
    g.userData.alto = 22;
  }

  /* Bodega con techo en diente de sierra y andenes */
  {
    const g = edificio('bodegas', 'Bodegas');
    const { mat, linea, detalle } = g.userData.mats;
    const nave = caja(24, 6.5, 14, mat);
    g.add(nave, bordes(nave, linea));
    // Dientes de sierra a lo largo de x
    const s = new Shape();
    s.moveTo(0, 0); s.lineTo(6, 0); s.lineTo(6, 2.2); s.lineTo(0, 0);
    const geoDiente = new ExtrudeGeometry(s, { depth: 14, bevelEnabled: false });
    geoDiente.translate(0, 0, -7);
    for (let k = 0; k < 4; k++) {
      const d = new Mesh(geoDiente, mat);
      d.position.set(-12 + k * 6, 6.5, 0);
      d.castShadow = true; d.receiveShadow = true;
      g.add(d, bordes(d, linea));
    }
    // Andenes: puertas en la cara frontal (+z)
    const p = [];
    for (let k = 0; k < 5; k++) {
      const x = -9.5 + k * 4.75, w = 1.5;
      p.push(x - w, 0.9, 7.03, x - w, 4.2, 7.03, x + w, 0.9, 7.03, x + w, 4.2, 7.03, x - w, 4.2, 7.03, x + w, 4.2, 7.03);
    }
    g.add(lineas(p, linea));
    const anden = caja(24, 0.9, 2, mat); anden.position.set(0, 0, 8);
    const alero = caja(24, 0.25, 3, mat); alero.position.set(0, 5, 8.5);
    g.add(anden, alero, bordes(anden, linea), bordes(alero, linea));
    g.add(lineas(fachada(24, 6.5, 14, { montantes: 3, caras: 'ew' }), detalle));
    g.position.set(-16.5, Y0, 11.5);
    g.userData.alto = 11;
  }

  /* Strip center con marquesina, estacionamientos y tótem */
  {
    const g = edificio('strip', 'Strip centers');
    const { mat, linea, detalle } = g.userData.mats;
    const locales = caja(20, 4.4, 6, mat);
    const marquesina = caja(20.6, 0.3, 2.6, mat); marquesina.position.set(0, 3.6, 4.2);
    const totem = caja(0.9, 7.5, 2, mat); totem.position.set(11.5, 0, 13);
    g.add(locales, marquesina, totem, bordes(locales, linea), bordes(marquesina, linea), bordes(totem, linea));
    g.add(lineas(fachada(20, 4.4, 6, { montantes: 2.5, caras: 's', hasta: 3.6 }), detalle));
    // Pilares de la marquesina
    for (let k = 0; k < 6; k++) {
      const c = caja(0.25, 3.6, 0.25, mat);
      c.position.set(-9.8 + k * 3.92, 0, 5.3);
      g.add(c);
    }
    // Demarcación de estacionamientos
    const e = [];
    for (let k = 0; k <= 9; k++) {
      const x = -9 + k * 2;
      e.push(x, 0.03, 7.5, x, 0.03, 11.5);
      e.push(x, 0.03, 13.5, x, 0.03, 17.5);
    }
    const est = lineas(e, detalle);
    g.add(est);
    g.position.set(17.5, Y0, 5.5);
    g.userData.alto = 9;
  }

  for (const g of edificios) fusionar(g);

  /* Árboles de maqueta */
  const posArboles = [
    [-30, -3.2], [-24, -3.2], [-18, -3.2], [-12, -3.2], [-5, -3.2],
    [9, -3.2], [15, -3.2], [22, -3.2], [28.5, -3.2],
    [-30, 3.3], [-3, 3.3], [9, 22], [15, 22.2], [21, 22.2], [27, 22.2],
    [0.8, -8], [0.8, 17], [7.6, 8], [-2.5, 22]
  ];
  const matCopa = new MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.9 });
  const geoCopa = new IcosahedronGeometry(0.95, 3);
  const geoTronco = new CylinderGeometry(0.07, 0.1, 1.3, 6);
  geoTronco.translate(0, 0.65, 0);
  const copas = new InstancedMesh(geoCopa, matCopa, posArboles.length);
  const troncos = new InstancedMesh(geoTronco, matCopa, posArboles.length);
  copas.castShadow = true; troncos.castShadow = true;
  const arboles = new Group();
  arboles.add(copas, troncos);
  maqueta.add(arboles);
  const o = new Object3D();
  posArboles.forEach(([x, z], i) => {
    const s = 0.85 + ((i * 37) % 10) / 30;
    o.position.set(x, Y0, z); o.scale.set(1, 1, 1); o.updateMatrix();
    troncos.setMatrixAt(i, o.matrix);
    o.position.set(x, Y0 + 1.3 + s * 0.8, z); o.scale.set(s, s * 1.05, s); o.updateMatrix();
    copas.setMatrixAt(i, o.matrix);
  });

  /* Sombra sobre la página */
  const suelo = new Mesh(new PlaneGeometry(260, 260), new ShadowMaterial({ opacity: 0.13, color: '#1B2550' }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = -1.6;
  suelo.receiveShadow = true;
  escena.add(suelo);

  /* Luz */
  escena.add(new HemisphereLight('#FFFFFF', '#C2CCDF', 2.05));
  const sol = new DirectionalLight('#FFFFFF', 2.25);
  sol.position.set(-38, 62, 22);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.camera.left = -52; sol.shadow.camera.right = 52;
  sol.shadow.camera.top = 52; sol.shadow.camera.bottom = -52;
  sol.shadow.camera.near = 10; sol.shadow.camera.far = 170;
  sol.shadow.bias = -0.0006;
  sol.shadow.normalBias = 0.02;
  sol.shadow.radius = 9;
  sol.shadow.blurSamples = 10;
  escena.add(sol);

  return { escena, maqueta, edificios, arboles, sol };
}

/* ------------------------------------------------------------------ */
/* Montaje                                                              */
/* ------------------------------------------------------------------ */

const suave = (t) => 1 - Math.pow(1 - t, 3);

export function montar(contenedor, opciones = {}) {
  const reducido = !!opciones.movimientoReducido;
  const alResaltar = opciones.alResaltar || (() => {});
  const alElegir = opciones.alElegir || (() => {});

  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  if (!renderer.getContext()) return null;

  const movil = Math.min(window.innerWidth, window.innerHeight) < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, movil ? 1.75 : 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = VSMShadowMap;
  // Las sombras sólo se recalculan cuando la maqueta se mueve lo suficiente.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'maqueta__lienzo';
  contenedor.appendChild(canvas);

  const { escena, maqueta, edificios, arboles, sol } = construir();
  if (movil) sol.shadow.mapSize.set(1024, 1024);

  const camara = new PerspectiveCamera(24, 1, 1, 900);
  const encuadre = Object.assign({ azimut: 0.7, elevacion: 0.6, margenX: 0.1, margenY: 0.09, corrimientoX: 0 }, opciones.encuadre || {});
  const direccion = new Vector3(
    Math.cos(encuadre.elevacion) * Math.sin(encuadre.azimut),
    Math.sin(encuadre.elevacion),
    Math.cos(encuadre.elevacion) * Math.cos(encuadre.azimut)
  );
  // Puntos que deben quedar dentro del cuadro: la caja de la maqueta completa.
  maqueta.updateMatrixWorld(true);
  const caja3 = new Box3().setFromObject(maqueta);
  const esquinas = [];
  for (const x of [caja3.min.x, caja3.max.x])
    for (const y of [caja3.min.y, caja3.max.y])
      for (const z of [caja3.min.z, caja3.max.z]) esquinas.push(new Vector3(x, y, z));
  const centro = caja3.getCenter(new Vector3());
  const objetivo = centro.clone();
  const tmp = new Vector3();

  function medir(dist) {
    camara.position.copy(objetivo).addScaledVector(direccion, dist);
    camara.lookAt(objetivo);
    camara.updateMatrixWorld(true);
    camara.updateProjectionMatrix();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const e of esquinas) {
      tmp.copy(e).project(camara);
      minX = Math.min(minX, tmp.x); maxX = Math.max(maxX, tmp.x);
      minY = Math.min(minY, tmp.y); maxY = Math.max(maxY, tmp.y);
    }
    return { minX, maxX, minY, maxY };
  }

  /** Busca la distancia y el centro que hacen calzar la maqueta en el cuadro. */
  function ubicarCamara() {
    const w = contenedor.clientWidth || 1, h = contenedor.clientHeight || 1;
    camara.aspect = w / h;
    renderer.setSize(w, h, false);
    objetivo.copy(centro);
    let dist = 200;
    for (let paso = 0; paso < 3; paso++) {
      let lo = 40, hi = 900;
      for (let i = 0; i < 28; i++) {
        const mid = (lo + hi) / 2;
        const b = medir(mid);
        const cabe = (b.maxX - b.minX) / 2 <= 1 - encuadre.margenX && (b.maxY - b.minY) / 2 <= 1 - encuadre.margenY;
        if (cabe) hi = mid; else lo = mid;
      }
      dist = hi;
      // Centrar: corre el objetivo según el desfase en pantalla
      const b = medir(dist);
      const cx = (b.minX + b.maxX) / 2 - encuadre.corrimientoX, cy = (b.minY + b.maxY) / 2;
      const altoVisible = 2 * dist * Math.tan((camara.fov * Math.PI) / 360);
      const anchoVisible = altoVisible * camara.aspect;
      const derecha = new Vector3().setFromMatrixColumn(camara.matrixWorld, 0);
      const arriba = new Vector3().setFromMatrixColumn(camara.matrixWorld, 1);
      objetivo.addScaledVector(derecha, (cx * anchoVisible) / 2).addScaledVector(arriba, (cy * altoVisible) / 2);
    }
    medir(dist);
  }
  ubicarCamara();

  /* Estado de animación */
  const inicio = performance.now();
  const escalaInicial = reducido ? 1 : 0.0001;
  edificios.forEach((g) => g.scale.set(1, escalaInicial, 1));
  arboles.scale.setScalar(reducido ? 1 : 0.0001);
  // Orden de aparición: de adelante hacia atrás
  const orden = ['strip', 'bodegas', 'condominios', 'oficinas', 'edificios'];

  let activo = null;
  const tintes = new Map(); // clave -> 0..1
  edificios.forEach((g) => tintes.set(g.userData.clave, 0));

  let punteroX = 0, punteroY = 0, suaveX = 0, suaveY = 0;
  let desplazamiento = 0;
  let visible = true, corriendo = false, destruido = false;
  let necesitaCuadro = true;

  function aplicarTintes(dt) {
    let cambio = false;
    for (const g of edificios) {
      const clave = g.userData.clave;
      const meta = activo === clave ? 1 : 0;
      let t = tintes.get(clave);
      if (Math.abs(meta - t) > 0.001) {
        t += (meta - t) * Math.min(1, dt * 9);
        if (Math.abs(meta - t) < 0.002) t = meta;
        tintes.set(clave, t);
        cambio = true;
      }
      const { mat, linea, detalle } = g.userData.mats;
      mat.color.copy(BLANCO).lerp(NAVY_LUZ, t);
      linea.color.copy(NAVY).lerp(CELESTE, t);
      detalle.color.copy(NAVY).lerp(CELESTE, t);
      const atenuar = activo && activo !== clave ? 0.55 : 1;
      linea.opacity = 0.5 * atenuar + 0.35 * t;
      detalle.opacity = 0.22 * atenuar + 0.3 * t;
    }
    return cambio;
  }

  const proyectado = new Vector3();
  function posicionEtiqueta() {
    if (!activo) return null;
    const g = edificios.find((e) => e.userData.clave === activo);
    if (!g) return null;
    proyectado.set(0, g.userData.alto, 0);
    g.localToWorld(proyectado);
    proyectado.project(camara);
    return {
      x: (proyectado.x * 0.5 + 0.5) * contenedor.clientWidth,
      y: (-proyectado.y * 0.5 + 0.5) * contenedor.clientHeight
    };
  }

  let ultimo = performance.now();
  let interaccionHasta = 0;
  let sombraY = 0, sombraX = 0;
  /* Calidad adaptable: si el equipo no sostiene la animación, la maqueta
     deja de girar sola y sólo se dibuja cuando algo cambia. */
  let ligero = false, evaluado = false;
  let cuadrosSubida = 0, inicioSubida = 0;

  function cuadro(ahora) {
    if (destruido) return;
    // En reposo basta con ~30 cuadros por segundo: el giro es muy lento.
    const enReposo = ahora > interaccionHasta && ahora - inicio > 2600;
    if (enReposo && !necesitaCuadro && ahora - ultimo < 31) {
      requestAnimationFrame(cuadro);
      return;
    }
    const dt = Math.min(0.05, (ahora - ultimo) / 1000);
    ultimo = ahora;
    const t = (ahora - inicio) / 1000;

    let animando = false;
    if (!reducido) {
      let subiendo = false;
      orden.forEach((clave, i) => {
        const g = edificios.find((e) => e.userData.clave === clave);
        const p = Math.min(1, Math.max(0, (t - 0.15 - i * 0.12) / 1.25));
        g.scale.y = Math.max(0.0001, suave(p));
        if (p < 1) subiendo = true;
      });
      const pa = Math.min(1, Math.max(0, (t - 1.0) / 0.8));
      arboles.scale.setScalar(Math.max(0.0001, suave(pa)));
      if (pa < 1) subiendo = true;

      if (subiendo) {
        if (!cuadrosSubida) inicioSubida = performance.now();
        cuadrosSubida++;
      } else if (!evaluado) {
        evaluado = true;
        // Promedio real entre cuadros durante la subida (reloj de pared)
        const promedio = (performance.now() - inicioSubida) / Math.max(1, cuadrosSubida);
        if (promedio > 45) ligero = true;
      }

      const antesX = suaveX, antesY = suaveY;
      suaveX += (punteroX - suaveX) * Math.min(1, dt * 3);
      suaveY += (punteroY - suaveY) * Math.min(1, dt * 3);
      const deriva = ligero ? 0 : Math.sin(t * 0.11) * 0.07;
      maqueta.rotation.y = deriva + suaveX * 0.07 + desplazamiento * 0.22;
      maqueta.rotation.x = suaveY * 0.025;
      const siguePuntero = Math.abs(suaveX - antesX) > 0.0005 || Math.abs(suaveY - antesY) > 0.0005;
      animando = subiendo || !ligero || siguePuntero;
    } else {
      maqueta.rotation.y = desplazamiento * 0.22;
    }

    const cambioTinte = aplicarTintes(dt);
    if (Math.abs(maqueta.rotation.y - sombraY) > 0.004 || Math.abs(maqueta.rotation.x - sombraX) > 0.004 || (!reducido && t < 2.2)) {
      renderer.shadowMap.needsUpdate = true;
      sombraY = maqueta.rotation.y;
      sombraX = maqueta.rotation.x;
    }
    if (animando || cambioTinte || necesitaCuadro) {
      renderer.render(escena, camara);
      necesitaCuadro = false;
      alResaltar(activo, posicionEtiqueta());
    }
    if (visible && !document.hidden && (animando || cambioTinte)) {
      requestAnimationFrame(cuadro);
    } else {
      corriendo = false;
    }
  }

  function arrancar() {
    if (corriendo || destruido) return;
    corriendo = true;
    ultimo = performance.now();
    requestAnimationFrame(cuadro);
  }

  /* Interacción */
  const rayo = new Raycaster();
  const puntero = new Vector2();
  function edificioBajo(ev) {
    const r = canvas.getBoundingClientRect();
    puntero.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    puntero.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    rayo.setFromCamera(puntero, camara);
    const golpes = rayo.intersectObjects(edificios, true);
    for (const h of golpes) {
      let o = h.object;
      while (o && !o.userData.clave) o = o.parent;
      if (o && o.userData.clave) return o.userData.clave;
    }
    return null;
  }

  function resaltar(clave) {
    interaccionHasta = performance.now() + 1500;
    if (clave === activo) return;
    activo = clave || null;
    necesitaCuadro = true;
    arrancar();
  }

  function alMover(ev) {
    interaccionHasta = performance.now() + 1200;
    const r = contenedor.getBoundingClientRect();
    punteroX = ((ev.clientX - r.left) / r.width) * 2 - 1;
    punteroY = ((ev.clientY - r.top) / r.height) * 2 - 1;
    if (ev.pointerType === 'mouse') {
      const clave = edificioBajo(ev);
      canvas.style.cursor = clave ? 'pointer' : '';
      resaltar(clave);
    }
    arrancar();
  }
  function alSalir(ev) {
    if (ev.pointerType === 'mouse') { resaltar(null); canvas.style.cursor = ''; }
    punteroX = 0; punteroY = 0;
  }
  function alTocar(ev) {
    const clave = edificioBajo(ev);
    if (!clave) { resaltar(null); return; }
    if (ev.pointerType === 'mouse') alElegir(clave);
    else resaltar(clave);
  }
  canvas.addEventListener('pointermove', alMover);
  canvas.addEventListener('pointerleave', alSalir);
  canvas.addEventListener('click', alTocar);

  const ro = new ResizeObserver(() => { ubicarCamara(); renderer.shadowMap.needsUpdate = true; necesitaCuadro = true; arrancar(); });
  ro.observe(contenedor);

  const io = new IntersectionObserver((entradas) => {
    visible = entradas[0].isIntersecting;
    if (visible) arrancar();
  });
  io.observe(contenedor);

  function alVisibilidad() { if (!document.hidden) arrancar(); }
  document.addEventListener('visibilitychange', alVisibilidad);

  arrancar();

  return {
    resaltar,
    desplazar(p) {
      if (Math.abs(p - desplazamiento) < 0.0005) return;
      desplazamiento = p;
      if (!visible) return;
      necesitaCuadro = true;
      arrancar();
    },
    destruir() {
      destruido = true;
      ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', alVisibilidad);
      renderer.dispose();
      canvas.remove();
    }
  };
}

if (typeof window !== 'undefined') {
  window.Escena3D = { montar };
}
