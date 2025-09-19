// Mapear tipos del front → TypeMapper del back
// Back soporta: LONG, INT, BOOLEAN, DECIMAL, LOCAL_DATE, LOCAL_DATE_TIME, (por defecto STRING)
const TYPE_MAP = {
  'long': 'LONG',
  'int': 'INT',
  'integer': 'INT',
  'bool': 'BOOLEAN',
  'boolean': 'BOOLEAN',
  'decimal': 'DECIMAL',
  'bigdecimal': 'DECIMAL',
  'localdate': 'LOCAL_DATE',
  'date': 'LOCAL_DATE',
  'localdatetime': 'LOCAL_DATE_TIME',
  'datetime': 'LOCAL_DATE_TIME',
  'string': 'STRING',
  'text': 'STRING',
};

function normalizeType(raw) {
  if (!raw) return 'STRING';
  const t = String(raw).trim().toLowerCase();
  return TYPE_MAP[t] || 'STRING';
}

/**
 * Acepta atributos tipo texto como: "+ id: Long", "nombre: String", "activo: boolean pk", etc.
 * Flags soportados (opcional, al final separados por espacios): pk, generated=IDENTITY|...
 */
function parseAttributeLine(line) {
  if (!line) return null;
  // limpia signos + - # opcionales
  let s = String(line).trim().replace(/^(\+|-|#)\s*/, '');

  // "nombre: Tipo resto"
  const parts = s.split(':');
  let name = parts[0]?.trim();
  let rest = parts[1]?.trim() || '';

  if (!name) return null;

  // separa tipo y posibles flags
  let typePart = rest;
  let flagsPart = '';

  // si hay espacio, lo tomamos como "Tipo flags"
  const sp = rest.indexOf(' ');
  if (sp !== -1) {
    typePart = rest.slice(0, sp).trim();
    flagsPart = rest.slice(sp + 1).trim();
  }

  const attr = {
    name,
    type: normalizeType(typePart || 'STRING'),
  };

  if (flagsPart) {
    // soporta "pk" y "generated=IDENTITY"
    flagsPart.split(/\s+/).forEach(tok => {
      const [k, v] = tok.split('=');
      if (k?.toLowerCase() === 'pk') attr.pk = true;
      if (k?.toLowerCase() === 'generated' && v) attr.generated = v.toUpperCase();
    });
  }

  return attr;
}

/**
 * Convierte el graph JSON de JointJS a ModelSpec que el backend espera.
 * - Solo toma elementos con type 'uml.Class' (o fallback con ese type seteado)
 * - attributes del elemento: array de strings
 */
export function buildModelSpecFromGraph(graphJSON, opts = {}) {
  const {
    name = 'generated-app',
    version = '0.0.1',
    packageBase = 'com.jezabel.generated',
  } = opts;

  const cells = graphJSON?.cells || [];
  const entities = [];

  for (const c of cells) {
    const type = c.type || c.attrs?.type;
    if (type !== 'uml.Class') continue;

    const entityName = c.name || c.attrs?.label?.text || 'Unnamed';
    const rawAttrs = c.attributes || c.attrs?.attributes || [];

    const attrs = [];
    for (const line of rawAttrs) {
      const parsed = parseAttributeLine(line);
      if (parsed) attrs.push(parsed);
    }

    // Si no hay PK, y existe "id" → márcalo como PK por defecto
    if (!attrs.some(a => a.pk)) {
      const idAttr = attrs.find(a => a.name.toLowerCase() === 'id');
      if (idAttr) {
        idAttr.pk = true;
        if (!idAttr.generated) idAttr.generated = 'IDENTITY';
      }
    }

    entities.push({
      name: entityName.replace(/\W+/g, ''), // nombre limpio
      attributes: attrs,
    });
  }

  return { name, version, packageBase, entities };
}
