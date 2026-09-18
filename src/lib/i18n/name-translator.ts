/**
 * Traductor de nombres de ejercicio EN → ES.
 *
 * Los 1.324 nombres son composicionales y muy regulares:
 *
 *     [equipo] [posición] [modificador] [MOVIMIENTO] [agarre]
 *     dumbbell  seated     one leg       calf raise   - hammer grip
 *
 * El inglés coloca los modificadores ANTES del núcleo; el español DESPUÉS.
 * Traducir palabra por palabra da basura ("mancuerna sentado una pierna
 * pantorrilla elevación"), así que cada token se clasifica en una ranura y se
 * reensambla con el orden español:
 *
 *     MOVIMIENTO + MODIFICADOR + POSICIÓN + "con " EQUIPO + "(" AGARRE ")"
 *     Elevación de talones a una pierna sentado con mancuerna (agarre martillo)
 *
 * Genera `generated/exercise-names.es.json` (scripts/build-name-dictionary.ts)
 * y actúa de respaldo en el sync para lo que la API añada después.
 */

export interface ResultadoTraduccion {
  nombre: string;
  /** Tokens que no se supieron traducir. Vacío = traducción completa. */
  desconocidos: string[];
}

/**
 * Núcleo del nombre. Se declara GÉNERO y NÚMERO porque los adjetivos
 * españoles concuerdan con él: "Sentadilla inversA" pero "Curl inversO".
 * Sin esto, uno de cada tres nombres suena mal.
 */
interface Movimiento {
  es: string;
  genero: 'm' | 'f';
  numero: 'sg' | 'pl';
}

const m = (es: string, genero: 'm' | 'f', numero: 'sg' | 'pl' = 'sg'): Movimiento => ({
  es,
  genero,
  numero,
});

// ---------------------------------------------------------------------------
// 1. FRASES — antes que los tokens sueltos: su significado no es composicional.
//    "close-grip" no es "cerrado agarre".
// ---------------------------------------------------------------------------
const FRASES: ReadonlyArray<readonly [RegExp, string]> = [
  // Metadatos del GIF, no del ejercicio: se eliminan.
  [/\((?:back|side|front)\s+pov\)/g, ' '],
  [/\b(?:back|side|front)\s+pov\b/g, ' '],
  [/\((?:male|female)\)/g, ' '],
  [/\b(?:male|female)\b/g, ' '],

  [/\barm blaster\b/g, '@armblaster'],
  [/\bupper body ergometer\b/g, '@ergometro'],
  [/\bwheel rollerout\b/g, '@ruedaabdominal'],
  [/\bab rollerout\b/g, '@ruedaabdominal'],
  [/\brollerout\b/g, '@ruedaabdominal'],
  [/\bwheel roller\b/g, '@ruedaabdominal'],
  [/\bstability ball\b/g, '@fitball'],
  [/\bexercise ball\b/g, '@fitball'],
  [/\bmedicine ball\b/g, '@balonmedicinal'],
  [/\bbosu ball\b/g, '@bosu'],
  [/\bstationary bike\b/g, '@bicicleta'],
  [/\belliptical machine\b/g, '@eliptica'],
  [/\bstepmill machine\b/g, '@escaladora'],
  [/\bskierg machine\b/g, '@skierg'],
  [/\bsled machine\b/g, '@trineo'],
  [/\bsmith machine\b/g, '@smith'],
  [/\bleverage machine\b/g, '@palanca'],
  [/\bolympic barbell\b/g, '@barraolimpica'],
  [/\bez[- ]?barbell\b/g, '@barraz'],
  [/\bez[- ]?bar\b/g, '@barraz'],
  [/\btrap bar\b/g, '@barrahex'],
  [/\bv[- ]?bar\b/g, '@barrav'],
  [/\bpro lat bar\b/g, '@barradorsal'],
  [/\blat bar\b/g, '@barradorsal'],
  [/\bstraight bar\b/g, '@barrarecta'],
  [/\bresistance band\b/g, '@banda'],
  [/\bbody ?weight\b/g, '@pesocorporal'],

  [/\bsit[- ]?ups?\b/g, '@abdominal'],
  [/\bpush[- ]?ups?\b/g, '@flexion'],
  [/\bpull[- ]?ups?\b/g, '@dominada'],
  [/\bchin[- ]?ups?\b/g, '@dominadasupina'],
  [/\bpull[- ]?downs?\b/g, '@jalon'],
  [/\bpulldowns?\b/g, '@jalon'],
  [/\bpush[- ]?downs?\b/g, '@extensionpolea'],
  [/\bpull[- ]?through\b/g, '@pullthrough'],
  [/\bstep[- ]?ups?\b/g, '@subidacajon'],
  [/\bcalf raises?\b/g, '@elevaciontalon'],
  [/\blateral raises?\b/g, '@elevacionlateral'],
  [/\bfront raises?\b/g, '@elevacionfrontal'],
  [/\bleg raises?\b/g, '@elevacionpiernas'],
  [/\bhip thrusts?\b/g, '@hipthrust'],
  [/\bgood mornings?\b/g, '@buenosdias'],
  [/\bjumping jacks?\b/g, '@jumpingjack'],
  [/\bmountain climbers?\b/g, '@escalador'],
  [/\bburpees?\b/g, '@burpee'],
  [/\bdeadlifts?\b/g, '@pesomuerto'],
  [/\bskull ?crushers?\b/g, '@pressfrances'],
  [/\bupright rows?\b/g, '@remomenton'],
  [/\bface pull\b/g, '@facepull'],
  [/\bhyperextensions?\b/g, '@hiperextension'],
  [/\bpelvic tilt\b/g, '@basculapelvica'],
  [/\bwindmills?\b/g, '@molino'],
  [/\bplanche\b/g, '@planche'],

  [/\bbent[- ]?over\b/g, '@inclinado'],
  [/\bstiff[- ]?legged?\b/g, '@piernarigida'],
  [/\bstiff leg\b/g, '@piernarigida'],
  [/\bstraight leg\b/g, '@piernarecta'],
  [/\bclose[- ]?grip\b/g, '@agarrecerrado'],
  [/\bwide[- ]?grip\b/g, '@agarreancho'],
  [/\bhammer[- ]?grip\b/g, '@agarremartillo'],
  [/\breverse[- ]?grip\b/g, '@agarreinvertido'],
  [/\bneutral[- ]?grip\b/g, '@agarreneutro'],
  [/\bunderhand\b/g, '@agarresupino'],
  [/\boverhand\b/g, '@agarrepronado'],
  [/\bone arm\b/g, '@unbrazo'],
  [/\bsingle arm\b/g, '@unbrazo'],
  [/\bone leg\b/g, '@unapierna'],
  [/\bsingle leg\b/g, '@unapierna'],
  [/\btwo arms?\b/g, '@dosbrazos'],
  [/\bself[- ]?assisted\b/g, '@autoasistido'],
  [/\bbehind (?:the )?head\b/g, '@detrasnuca'],
  [/\bbehind (?:the )?neck\b/g, '@detrasnuca'],
  [/\bbottoms? up\b/g, '@invertida'],
  [/\brange of motion\b/g, '@rangomovimiento'],
  [/\bv\.\s*(\d+)/g, '@version$1'],
];

const MOVIMIENTOS: Record<string, Movimiento> = {
  '@abdominal': m('Abdominales', 'm', 'pl'),
  '@flexion': m('Flexiones', 'f', 'pl'),
  '@dominada': m('Dominadas', 'f', 'pl'),
  '@dominadasupina': m('Dominadas supinas', 'f', 'pl'),
  '@jalon': m('Jalón', 'm'),
  '@extensionpolea': m('Extensión en polea', 'f'),
  '@pullthrough': m('Pull through', 'm'),
  '@subidacajon': m('Subida al cajón', 'f'),
  '@elevaciontalon': m('Elevación de talones', 'f'),
  '@elevacionlateral': m('Elevaciones laterales', 'f', 'pl'),
  '@elevacionfrontal': m('Elevaciones frontales', 'f', 'pl'),
  '@elevacionpiernas': m('Elevaciones de piernas', 'f', 'pl'),
  '@hipthrust': m('Hip thrust', 'm'),
  '@buenosdias': m('Buenos días', 'm', 'pl'),
  '@jumpingjack': m('Jumping jacks', 'm', 'pl'),
  '@escalador': m('Escalador', 'm'),
  '@burpee': m('Burpees', 'm', 'pl'),
  '@pesomuerto': m('Peso muerto', 'm'),
  '@pressfrances': m('Press francés', 'm'),
  '@remomenton': m('Remo al mentón', 'm'),
  '@facepull': m('Face pull', 'm'),
  '@hiperextension': m('Hiperextensiones', 'f', 'pl'),
  '@basculapelvica': m('Báscula pélvica', 'f'),
  '@molino': m('Molino', 'm'),
  '@planche': m('Planche', 'm'),
  '@ruedaabdominal': m('Rueda abdominal', 'f'),
  curl: m('Curl', 'm'),
  curls: m('Curl', 'm'),
  press: m('Press', 'm'),
  presses: m('Press', 'm'),
  row: m('Remo', 'm'),
  rows: m('Remo', 'm'),
  squat: m('Sentadilla', 'f'),
  squats: m('Sentadillas', 'f', 'pl'),
  lunge: m('Zancada', 'f'),
  lunges: m('Zancadas', 'f', 'pl'),
  raise: m('Elevación', 'f'),
  raises: m('Elevaciones', 'f', 'pl'),
  extension: m('Extensión', 'f'),
  extensions: m('Extensiones', 'f', 'pl'),
  fly: m('Aperturas', 'f', 'pl'),
  flye: m('Aperturas', 'f', 'pl'),
  flyes: m('Aperturas', 'f', 'pl'),
  crunch: m('Crunch', 'm'),
  crunches: m('Crunches', 'm', 'pl'),
  shrug: m('Encogimiento', 'm'),
  shrugs: m('Encogimientos', 'm', 'pl'),
  dip: m('Fondos', 'm', 'pl'),
  dips: m('Fondos', 'm', 'pl'),
  thrust: m('Empuje', 'm'),
  pullover: m('Pullover', 'm'),
  twist: m('Giro', 'm'),
  bend: m('Flexión lateral', 'f'),
  stretch: m('Estiramiento', 'm'),
  plank: m('Plancha', 'f'),
  bridge: m('Puente', 'm'),
  clean: m('Cargada', 'f'),
  snatch: m('Arrancada', 'f'),
  jerk: m('Envión', 'm'),
  swing: m('Swing', 'm'),
  kickback: m('Patada', 'f'),
  pull: m('Tracción', 'f'),
  push: m('Empuje', 'm'),
  jump: m('Salto', 'm'),
  jumps: m('Saltos', 'm', 'pl'),
  hang: m('Suspensión', 'f'),
  hold: m('Isometría', 'f'),
  walk: m('Caminata', 'f'),
  run: m('Carrera', 'f'),
  sprint: m('Sprint', 'm'),
  climb: m('Escalada', 'f'),
  rotation: m('Rotación', 'f'),
  circles: m('Círculos', 'm', 'pl'),
  abduction: m('Abducción', 'f'),
  adduction: m('Aducción', 'f'),
  lift: m('Elevación', 'f'),
  throw: m('Lanzamiento', 'm'),
  kick: m('Patada', 'f'),
  tap: m('Toque', 'm'),
  touch: m('Toque', 'm'),
  reach: m('Alcance', 'm'),
  pike: m('Pica', 'f'),
  drop: m('Caída', 'f'),
  flip: m('Volteo', 'm'),
  step: m('Paso', 'm'),
  pose: m('Postura', 'f'),
  stance: m('Postura', 'f'),
  balance: m('Equilibrio', 'm'),
  handstand: m('Parada de manos', 'f'),
  inchworm: m('Oruga', 'f'),
  crawl: m('Desplazamiento', 'm'),
  march: m('Marcha', 'f'),
  slam: m('Golpe', 'm'),
  squeeze: m('Contracción', 'f'),
  hug: m('Abrazo', 'm'),
  pass: m('Pase', 'm'),
  thruster: m('Thruster', 'm'),
  kicks: m('Patadas', 'f', 'pl'),
  twists: m('Giros', 'm', 'pl'),
  crossovers: m('Cruces', 'm', 'pl'),
  wipers: m('Limpiaparabrisas', 'm', 'pl'),
  jackknife: m('Navaja', 'f'),
  flexion: m('Flexión', 'f'),
  pronation: m('Pronación', 'f'),
  supination: m('Supinación', 'f'),
  rotate: m('Rotación', 'f'),
  drive: m('Empuje', 'm'),
  get: m('Levantada', 'f'),
  position: m('Posición', 'f'),
  figure: m('Figura', 'f'),
  depth: m('Salto de profundidad', 'm'),
};

const EQUIPOS: Record<string, string> = {
  dumbbell: 'mancuerna', dumbbells: 'mancuernas', barbell: 'barra', cable: 'polea',
  band: 'banda elástica', bands: 'bandas elásticas', kettlebell: 'pesa rusa',
  lever: 'máquina', machine: 'máquina', ball: 'balón', rope: 'cuerda',
  roller: 'rodillo', tire: 'neumático', sled: 'trineo', bench: 'banco',
  bar: 'barra', bars: 'barras', chair: 'silla', towel: 'toalla', wheel: 'rueda',
  bike: 'bicicleta', attachment: 'accesorio', support: 'apoyo', stirrups: 'estribos',
  '@barraolimpica': 'barra olímpica', '@barraz': 'barra Z', '@barrahex': 'barra hexagonal',
  '@barrav': 'barra en V', '@barradorsal': 'barra de dorsales', '@barrarecta': 'barra recta',
  '@banda': 'banda de resistencia', '@pesocorporal': 'peso corporal', '@smith': 'máquina Smith',
  '@palanca': 'máquina de palanca', '@fitball': 'fitball', '@balonmedicinal': 'balón medicinal',
  '@bosu': 'bosu', '@bicicleta': 'bicicleta estática', '@eliptica': 'elíptica',
  '@escaladora': 'escaladora', '@skierg': 'SkiErg', '@trineo': 'trineo',
  '@ergometro': 'ergómetro de brazos', '@armblaster': 'arm blaster',
  smith: 'máquina Smith', hammer: 'martillo', suspension: 'suspensión',
  weighted: 'peso añadido', assisted: 'asistencia',
};

/**
 * Postura del cuerpo. INVARIABLE: describe a quien ejecuta, no al ejercicio,
 * y el uso habitual en español de gimnasio es el masculino fijo
 * ("Elevaciones laterales sentado", no "sentadas").
 */
const POSICIONES: Record<string, string> = {
  seated: 'sentado', standing: 'de pie', lying: 'tumbado', kneeling: 'de rodillas',
  incline: 'inclinado', decline: 'declinado', flat: 'plano', prone: 'boca abajo',
  supine: 'boca arriba', '@inclinado': 'inclinado', hanging: 'en suspensión',
  side: 'lateral', front: 'frontal', rear: 'posterior', overhead: 'por encima de la cabeza',
  floor: 'en el suelo', wall: 'en la pared', vertical: 'vertical', horizontal: 'horizontal',
  squatting: 'en sentadilla', suspended: 'suspendido', parallel: 'en paralelas',
  '@detrasnuca': 'tras nuca', seated_alt: 'sentado',
};

/** Adjetivos que SÍ concuerdan con el movimiento. Se guardan en masculino singular. */
const MODIFICADORES_CONCORDANTES: Record<string, string> = {
  reverse: 'inverso', inverse: 'inverso', revers: 'inverso', inverted: 'invertido',
  alternate: 'alterno', alternating: 'alterno', complete: 'completo', full: 'completo',
  deep: 'profundo', close: 'cerrado', narrow: 'cerrado', wide: 'abierto',
  straight: 'recto', static: 'estático', dynamic: 'dinámico', isometric: 'isométrico',
  explosive: 'explosivo', slow: 'lento', neutral: 'neutro', extended: 'extendido',
  twisted: 'girado', raised: 'elevado', bent: 'flexionado', half: 'medio',
  '@piernarigida': 'a pierna rígida', '@piernarecta': 'a pierna recta',
  '@invertida': 'invertido', crossed: 'cruzado', tucked: 'recogido',
};

/** Modificadores invariables (sustantivos, gentilicios, nombres propios). */
const MODIFICADORES: Record<string, string> = {
  single: 'a una', one: 'a una', two: 'a dos', double: 'doble',
  '@unbrazo': 'a un brazo', '@unapierna': 'a una pierna', '@dosbrazos': 'a dos brazos',
  '@autoasistido': 'autoasistido', '@rangomovimiento': 'de rango completo',
  concentration: 'concentrado', preacher: 'predicador', hack: 'hack', sumo: 'sumo',
  romanian: 'rumano', bulgarian: 'búlgaro', military: 'militar', arnold: 'Arnold',
  zottman: 'Zottman', spider: 'araña', drag: 'drag', partial: 'parcial',
  split: 'split', russian: 'ruso', french: 'francés', cuban: 'cubano',
  zercher: 'Zercher', bradford: 'Bradford', rocky: 'Rocky', jm: 'JM',
  archer: 'arquero', frog: 'rana', donkey: 'burro', plyo: 'pliométrico',
  jumping: 'con salto', walking: 'caminando', twisting: 'con giro',
  rocking: 'con balanceo', circular: 'circular', diagonal: 'diagonal',
  cross: 'cruzado', crossover: 'cruzado', scapula: 'escapular', scapular: 'escapular',
  internal: 'interna', external: 'externa', inner: 'interno', outer: 'externo',
  lateral: 'lateral', medial: 'medial', anterior: 'anterior', posterior: 'posterior',
  upper: 'superior', lower: 'inferior', middle: 'medio', high: 'alto', low: 'bajo',
  wrist: 'de muñeca', ankle: 'de tobillo', hip: 'de cadera', knee: 'de rodilla',
  shoulder: 'de hombro', elbow: 'de codo', neck: 'de cuello', chest: 'de pecho',
  back: 'de espalda', leg: 'de pierna', legs: 'de piernas', arm: 'de brazo',
  arms: 'de brazos', glute: 'de glúteo', calf: 'de gemelo', calves: 'de gemelos',
  thigh: 'de muslo', abs: 'abdominal', ab: 'abdominal', oblique: 'de oblicuos',
  tricep: 'de tríceps', triceps: 'de tríceps', bicep: 'de bíceps', biceps: 'de bíceps',
  quad: 'de cuádriceps', quads: 'de cuádriceps', hamstring: 'de isquiotibiales',
  lat: 'de dorsales', lats: 'de dorsales', trap: 'de trapecio', traps: 'de trapecios',
  pec: 'de pectoral', deltoid: 'de deltoides', delt: 'de deltoides', delts: 'de deltoides',
  head: 'de cabeza', hands: 'con las manos', hand: 'con la mano', palm: 'con la palma',
  palms: 'con las palmas', toe: 'de puntillas', toes: 'de puntillas', knees: 'de rodillas',
  body: 'de cuerpo', muscle: 'muscular', forward: 'hacia delante', behind: 'por detrás',
  against: 'contra', between: 'entre', around: 'alrededor', iron: 'de hierro',
  flexor: 'flexor', extensor: 'extensor', chin: 'al mentón', motion: 'de movimiento',
  range: 'de rango', pelvic: 'pélvico', tilt: 'inclinación', v: 'en V', t: 'en T',
  // Lote 2: cola larga (2-3 apariciones cada uno). Muchos son nombres propios
  // de ejercicios que en español de gimnasio se usan tal cual.
  goblet: 'goblet', pistol: 'pistol', landmine: 'landmine', pallof: 'pallof',
  sissy: 'sissy', turkish: 'turco', judo: 'judo', gironda: 'Gironda',
  janda: 'Janda', otis: 'Otis', tate: 'Tate', jefferson: 'Jefferson',
  london: 'London', gorilla: 'gorila', stork: 'cigüeña', peacock: 'pavo real',
  maltese: 'maltés', renegade: 'renegade', monster: 'monster', pirate: 'pirata',
  seesaw: 'balancín', cocoons: 'cocoon', slingers: 'slinger', straddle: 'abierto',
  clasped: 'con manos entrelazadas', diamond: 'diamante', guillotine: 'guillotina',
  skull: 'francés', cambered: 'curvada', clock: 'reloj', tennis: 'de tenis',
  piriformis: 'piriforme', femoral: 'femoral', groin: 'de ingle', sternum: 'al esternón',
  spine: 'de columna', heel: 'de talón', finger: 'de dedos', face: 'de cara',
  jack: 'jack', tuck: 'recogido', hyper: 'hiper', power: 'de potencia',
  speed: 'de velocidad', rotational: 'rotacional', modified: 'modificado',
  advanced: 'avanzado', negative: 'negativo', mixed: 'mixto', fixed: 'fijo',
  gripless: 'sin agarre', kipping: 'con impulso', battling: 'de batida',
  ropes: 'cuerdas', ski: 'de esquí', skier: 'esquiador', pulley: 'polea',
  rack: 'rack', cage: 'jaula', board: 'tabla', box: 'cajón', pad: 'almohadilla',
  straps: 'correas', trainer: 'entrenador', three: 'tres', world: 'del mundo',
  'y': 'en Y', 'w': 'en W', 'l': 'en L', air: 'al aire', off: 'elevado',
  outside: 'exterior', inside: 'interior', above: 'por encima', across: 'cruzado',
  through: 'a través', out: 'hacia fuera', point: 'punto', response: 'respuesta',
  depresor: 'depresor', retractor: 'retractor', flutter: 'aleteo', 'dead': 'muerto',
  bug: 'bicho', can: 'lata', breeding: 'apertura', potty: 'en cuclillas',
  touchers: 'toques', lifting: 'de elevación', pronate: 'pronado',
  sitted: 'sentado', anti: 'anti', gravity: 'gravedad', supper: 'cena',
  ups: 'elevaciones', bottoms: 'invertido',
};

const AGARRES: Record<string, string> = {
  '@agarrecerrado': 'agarre cerrado', '@agarreancho': 'agarre ancho',
  '@agarremartillo': 'agarre martillo', '@agarreinvertido': 'agarre invertido',
  '@agarreneutro': 'agarre neutro', '@agarresupino': 'agarre supino',
  '@agarrepronado': 'agarre pronado', grip: 'agarre', pronated: 'pronado',
  supinated: 'supinado',
};

const IGNORADOS = new Set([
  'the', 'a', 'an', 'of', 'to', 'for', 'and', 'or', 'in', 'up', 'down',
  'exercise', 'variation', 'version', 'style', 'type', 'pov', 'male', 'female',
  'with', 'on', 'over', 'under', 'at', 'by', 'from', 'into', 'sit',
]);

// ---------------------------------------------------------------------------
// Concordancia
// ---------------------------------------------------------------------------

/** Flexiona un adjetivo español en masculino singular al género y número dados. */
function concordar(adjetivo: string, genero: 'm' | 'f', numero: 'sg' | 'pl'): string {
  // Las locuciones ("a pierna rígida") ya vienen flexionadas.
  if (adjetivo.includes(' ')) return adjetivo;

  let base = adjetivo;
  if (genero === 'f' && base.endsWith('o')) base = `${base.slice(0, -1)}a`;

  if (numero === 'pl') {
    if (/[aeiou]$/.test(base)) base += 's';
    else if (base.endsWith('z')) base = `${base.slice(0, -1)}ces`;
    else base += 'es';
  }
  return base;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

function normalizar(nombre: string): string {
  let t = nombre.toLowerCase().trim();
  // La API trae algunos nombres con mojibake: "45в°" en vez de "45°".
  t = t.replace(/в°/g, '°').replace(/Â°/g, '°');
  for (const [patron, reemplazo] of FRASES) t = t.replace(patron, reemplazo);
  t = t.replace(/[-–—]/g, ' ');
  t = t.replace(/[(),]/g, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

export function traducirNombre(nombreEn: string): ResultadoTraduccion {
  const tokens = normalizar(nombreEn).split(' ').filter(Boolean);

  let nucleo: Movimiento | null = null;
  const movimientosExtra: string[] = [];
  const equipos: string[] = [];
  const posiciones: string[] = [];
  const concordantes: string[] = [];
  const modificadores: string[] = [];
  const agarres: string[] = [];
  const literales: string[] = [];
  const desconocidos: string[] = [];

  for (const token of tokens) {
    if (/^@version\d+$/.test(token)) { literales.push(`v. ${token.slice(8)}`); continue; }
    if (/^[\d/°.]+$/.test(token)) { literales.push(token); continue; }
    if (IGNORADOS.has(token)) continue;

    const mov = MOVIMIENTOS[token];
    if (mov) {
      if (nucleo) movimientosExtra.push(mov.es.toLowerCase());
      else nucleo = mov;
      continue;
    }
    if (AGARRES[token]) { agarres.push(AGARRES[token]!); continue; }
    if (EQUIPOS[token]) { equipos.push(EQUIPOS[token]!); continue; }
    if (POSICIONES[token]) { posiciones.push(POSICIONES[token]!); continue; }
    if (MODIFICADORES_CONCORDANTES[token]) {
      concordantes.push(MODIFICADORES_CONCORDANTES[token]!);
      continue;
    }
    if (MODIFICADORES[token]) { modificadores.push(MODIFICADORES[token]!); continue; }

    desconocidos.push(token.replace(/^@/, ''));
    literales.push(token.replace(/^@/, ''));
  }

  const genero = nucleo?.genero ?? 'm';
  const numero = nucleo?.numero ?? 'sg';

  const partes: string[] = [];
  partes.push(nucleo ? nucleo.es : (literales.shift() ?? ''));
  if (movimientosExtra.length) partes.push(`con ${movimientosExtra.join(' y ')}`);
  if (concordantes.length) partes.push(concordantes.map((a) => concordar(a, genero, numero)).join(' '));
  if (modificadores.length) partes.push(modificadores.join(' '));
  if (literales.length) partes.push(literales.join(' '));
  if (posiciones.length) partes.push(posiciones.join(' '));
  if (equipos.length) partes.push(`con ${equipos.join(' y ')}`);

  let nombre = partes.filter(Boolean).join(' ');
  if (agarres.length) nombre += ` (${agarres.join(', ')})`;

  return { nombre: pulir(nombre) || nombreEn, desconocidos };
}

function pulir(texto: string): string {
  return texto
    .replace(/\bde el\b/g, 'del')
    .replace(/\bcon peso corporal\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}
