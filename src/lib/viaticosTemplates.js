// Catálogo Maestro Oficial de Viáticos Droguería El Olam
// Contiene las giras oficiales ordenadas por numeral con sus lugares a visitar,
// combustible, alimentación y hospedaje asignados a cada vendedor.
import { supabase } from './supabase.js';

export const OFFICIAL_ROUTE_VIATICOS_TEMPLATES = [
  // --- Ana Lucia Marroquin (#11 a #15) ---
  {
    vendor: 'Ana Lucia Marroquin',
    route_name: 'Quetzaltenango #11',
    numeral: '#11',
    lugares_visitar: 'Almolonga, La Esperanza, Olintepeque, Quetzaltenango, Salcajá, San Carlos Sija, Sibilia, Huitan, Cabrican, Pologua, Chivarreto',
    combustible: 900,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Ana Lucia Marroquin',
    route_name: 'Totonicapan #12',
    numeral: '#12',
    lugares_visitar: 'Totonicapan, Momostenango, San Andres Xecul, San Cristobal, San Francisco El Alto',
    combustible: 900,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Ana Lucia Marroquin',
    route_name: 'Coban #13',
    numeral: '#13',
    lugares_visitar: 'Pasmolon, Tactic, Santa Cruz Verapaz, San Cristobal Verapaz, Coban, San Pedro Carcha, San Juan Chamelco',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Ana Lucia Marroquin',
    route_name: 'Salama #14',
    numeral: '#14',
    lugares_visitar: 'El Rancho, San Agustin Acasaguastlan, Tulumaje, Tulumajillo, Morazan, Salama, San Miguel Chicaj, Rabinal, Cubulco, El Progreso Guastatoya',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Ana Lucia Marroquin',
    route_name: 'Municipios Oriente #15',
    numeral: '#15',
    lugares_visitar: 'Fraijanes, San Jose Pinula, Palencia, San Jose del Golfo, Aguas Calientes, San Antonio La Paz',
    combustible: 600,
    alimentacion: 175,
    hospedaje: 0,
    fotocopias: 0,
    otros: 0
  },

  // --- Jessica Noriega (#21 a #25) ---
  {
    vendor: 'Jessica Noriega',
    route_name: 'Suchi I #21',
    numeral: '#21',
    lugares_visitar: 'SAN BERNARDINO, RIO BRAVO, SAN ANTONIO, CHICACAO, SAMAYAC',
    combustible: 650,
    alimentacion: 175,
    hospedaje: 0,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Jessica Noriega',
    route_name: 'Retalhuleu #22',
    numeral: '#22',
    lugares_visitar: 'MULUA, SAN SEBASTIAN, NUEVO SAN CARLOS, CHAMPERICO, XAB, REU, SAN FELIPE',
    combustible: 650,
    alimentacion: 175,
    hospedaje: 0,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Jessica Noriega',
    route_name: 'Suchi II #23',
    numeral: '#23',
    lugares_visitar: 'MAZATE CENTRO, SANTO TOMAS LA UNION, JOCOPILAS, GUINEALES, CHOCOLA, MADRE MIA',
    combustible: 650,
    alimentacion: 175,
    hospedaje: 0,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Jessica Noriega',
    route_name: 'Coatepeque #24',
    numeral: '#24',
    lugares_visitar: 'XAB, PALMAR, GENOVA COSTA CUCA, FLORES COSTA CUCA, COLOMBA COSTA CUCA, LAS PALMAS, SAN MIGUELITO',
    combustible: 750,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Jessica Noriega',
    route_name: 'Suchi III #25',
    numeral: '#25',
    lugares_visitar: 'ZUNILITO, SAN FRANCISCO ZAPOTITLAN, CUYOTENANGO, SAN JOSE LA MAQUINA, SAN LORENZO, SAN GABRIEL',
    combustible: 650,
    alimentacion: 175,
    hospedaje: 0,
    fotocopias: 0,
    otros: 0
  },

  // --- Wally Natareno (#31 a #35) ---
  {
    vendor: 'Wally Natareno',
    route_name: 'Sacatepéquez #31',
    numeral: '#31',
    lugares_visitar: 'Santa Maria de Jesus, San Juan del Obispo, Ciudad Vieja, San Juan Alotenango, San Lorenzo el Cubo, San Antonio Aguas Calientes, Santa Catarina Barahona, San Lucas Sacatepéquez, San Santiago, Santa Maria Cauque, Sumpango, Santo Domigo Xenacoj',
    combustible: 900,
    alimentacion: 175,
    hospedaje: 0,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Wally Natareno',
    route_name: 'Quiche Centro #32',
    numeral: '#32',
    lugares_visitar: 'Los Encuentros, Chichicastenango, Quiche, Santa Lucia La Reforma, San Pedro Jocopilas, Sacapulas, San Antonio Ilotenango',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Wally Natareno',
    route_name: 'Quiche Montaña Baja #33',
    numeral: '#33',
    lugares_visitar: 'El Chol, Granados, Pachalum, Joyabaj, Zacualpa, Chinique, Chiche, Quiche, San Andres Sajcabaja, Canilla',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Wally Natareno',
    route_name: 'Izabal I #34',
    numeral: '#34',
    lugares_visitar: 'Aldea El Lobo, Los Amates, Morales, Playitas',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Wally Natareno',
    route_name: 'Izabal II #35',
    numeral: '#35',
    lugares_visitar: 'Aldea Buenos Aires, Rio Dulce, Guaytan, Entre Rios, Tenedores, Santo Tomas de Castilla, Puerto Barrios',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },

  // --- Erick Curley (#41 a #45) ---
  {
    vendor: 'Erick Curley',
    route_name: 'Jutiapa I #41',
    numeral: '#41',
    lugares_visitar: 'Jalpatagua, Moyuta, Ciudad Pedro de Alvarado, Comapa, San Jose Acatempa, Quezada, Jutiapa, El Progreso Jutiapa',
    combustible: 900,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Erick Curley',
    route_name: 'Jutiapa II #42',
    numeral: '#42',
    lugares_visitar: 'Horcones, Suchitan, Santa Catarina Mita, Jutiapa, El Progreso Jutiapa, Asuncion Mita, San Cristobal Frontera, Atescatempa, Jerez, El Adelanto, Yupiltepeque',
    combustible: 900,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Erick Curley',
    route_name: 'Chimaltenango I #43',
    numeral: '#43',
    lugares_visitar: 'Tecpan, Santa Apolonia, San Jose Poaquil, Patzun, Patzicia, Chimaltenango, Comalapa, El Tejar, Zaragosa',
    combustible: 900,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Erick Curley',
    route_name: 'Chimaltenango II #44',
    numeral: '#44',
    lugares_visitar: 'Tecpan, San Martin Jilotepeque, Acatenango, Parramos, San Pedro Yepocapa, Chimaltenango',
    combustible: 900,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Erick Curley',
    route_name: 'Santa Rosa #45',
    numeral: '#45',
    lugares_visitar: 'El Cerinal, Barberena, Cuilapa, Oratorio, Chiquimulilla, Casas Viejas, Guazacapan, Taxisco, Santa Cruz Naranjo, Santa Rosa de Lima, Nueva Santa Rosa, Casillas, Mataquescuintla',
    combustible: 900,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },

  // --- Estuardo Cordova (#51 a #55) ---
  {
    vendor: 'Estuardo Cordova',
    route_name: 'San Marcos Montaña Alta #51',
    numeral: '#51',
    lugares_visitar: 'SAN MARCOS, SAN PEDRO SACATEPEQUEZ, TEJUTLA, IXCHIGUAN, TACANA, SAN JOSE OJETENAM, CONCEPCION TUTUAPA, SAN MIGUEL IXTAHUACAN, SAN LORENZO, RIO BLANCO, SIPACA, COMITANCILLO',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Estuardo Cordova',
    route_name: 'Solola I #52',
    numeral: '#52',
    lugares_visitar: 'SANTA CLARA LA LAGUNA, SANTA LUCIA UTATLAN, SAN MARCOS LA LAGUNA, SAN JUAN LA LAGUNA, SAN PEDRO LA LAGUNA, PANAJACHEL',
    combustible: 650,
    alimentacion: 445,
    hospedaje: 450,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Estuardo Cordova',
    route_name: 'Solola II #53',
    numeral: '#53',
    lugares_visitar: 'Panajachel, Godinez, San Andres Semetabaj, San Lucas Toliman, Santiago Atitlan, San Jorge La Laguna',
    combustible: 650,
    alimentacion: 445,
    hospedaje: 450,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Estuardo Cordova',
    route_name: 'Nebaj #54',
    numeral: '#54',
    lugares_visitar: 'ALDEA MEDIA LUNA, ALDEA CHIUL, MADGDALENA LA ABUNDACION, NEBAJ, ALDEA LA PISTA, TZALBAL, SALQUIL',
    combustible: 800,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Estuardo Cordova',
    route_name: 'Quiche Montaña Alta #55',
    numeral: '#55',
    lugares_visitar: 'NEBAJ, COTOXA, RIO AZUL, XOLCUAY, CHAJUL, CUNEN, USPANTAN, CHICAMAN',
    combustible: 800,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },

  // --- Karina Pineda (#61 a #65) ---
  {
    vendor: 'Karina Pineda',
    route_name: 'Chiquimula I #61',
    numeral: '#61',
    lugares_visitar: 'Agua blanca, Ipala, Esquipulas, Aldea Chanmagua, Quezaltepe, Concepción Las Minas, Olopa',
    combustible: 800,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Karina Pineda',
    route_name: 'Jalapa #62',
    numeral: '#62',
    lugares_visitar: 'SANSARE, MONJAS, JALAPA, SAN LUIS JILOTEPEQUE, SAN MANUEL CHAPARRON, SANARATE, SAN PEDRO PINULA',
    combustible: 800,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Karina Pineda',
    route_name: 'Chiquimula II #63',
    numeral: '#63',
    lugares_visitar: 'CHIQUIMULA, SAN JOSE LA ARADA, JOCOTAN, SAN JACINTO',
    combustible: 800,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Karina Pineda',
    route_name: 'Capital S1 #64',
    numeral: '#64',
    lugares_visitar: 'CAPITAL',
    combustible: 500,
    alimentacion: 175,
    hospedaje: 0,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Karina Pineda',
    route_name: 'Capital S2 #65',
    numeral: '#65',
    lugares_visitar: 'CAPITAL',
    combustible: 500,
    alimentacion: 175,
    hospedaje: 0,
    fotocopias: 0,
    otros: 0
  },

  // --- Danny Perez (#71 a #74) ---
  {
    vendor: 'Danny Perez',
    route_name: 'Huehuetenango Montaña Baja I #71',
    numeral: '#71',
    lugares_visitar: 'Colotenango, San IDELFONSO IXTAHUACAN, CUILCO, SAN PEDRO NECTA, LA DEMOCRACIA, LA MESILLA, NENTON, GRACIAS A DIOS, EL AGUACATE',
    combustible: 1000,
    alimentacion: 665,
    hospedaje: 1050,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Danny Perez',
    route_name: 'Huehuetenango Montaña Baja II #72',
    numeral: '#72',
    lugares_visitar: 'EL TABACAL, SANTA ANA HUISTA, SAN ANTONIO HUISTA, PETAPAN, JACALTENANGO, SAN MARCOS HUISTA, SAN ANDRES HUISTA, CONCEPCION HUISTA, INCHEHUEX',
    combustible: 800,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Danny Perez',
    route_name: 'Peten I #73',
    numeral: '#73',
    lugares_visitar: 'TIERRA BLANCA, SAYAXCHE, SAN BENITO, FLORES',
    combustible: 1000,
    alimentacion: 665,
    hospedaje: 1050,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Danny Perez',
    route_name: 'Peten II #74',
    numeral: '#74',
    lugares_visitar: 'LAS CRUCES, LA LIBERTAD, SAN FRANCISCO, EL NARANJO FRONTERA, SAN BENITO, FLORES',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },

  // --- Klissman Hernandez (#81 a #84) ---
  {
    vendor: 'Klissman Hernandez',
    route_name: 'Polochic #81',
    numeral: '#81',
    lugares_visitar: 'El Estor, Senahu, Tucuro, Panzos, Teleman, San Julian, Purulha',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Klissman Hernandez',
    route_name: 'Zacapa #82',
    numeral: '#82',
    lugares_visitar: 'Estancia de La Virgen, San Cristobal Acasaguastlan, Teculután, Rio Hondo, Zacapa, Mayuelas, Gualan, La Union',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Klissman Hernandez',
    route_name: 'Huehuetenango Montaña Alta I #83',
    numeral: '#83',
    lugares_visitar: 'SAN JUAN IXCOY, SAN PEDRO SOLOMA, SANTA EULALIA, SAN MATEO IXTATAN, BARILLAS',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Klissman Hernandez',
    route_name: 'Huehuetenango Montaña Alta II #84',
    numeral: '#84',
    lugares_visitar: 'COATEN, SAN MIGUEL, SAN RAFAEL, BARILLAS , PALESTINA, LA UNION, SANTA EULALIA',
    combustible: 800,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },

  // --- Elio Caceros (#91 a #95) ---
  {
    vendor: 'Elio Caceros',
    route_name: 'Petapa #91',
    numeral: '#91',
    lugares_visitar: 'San Miguel Petapa, Zona 21, Villa Hermosa, Guajitos',
    combustible: 300,
    alimentacion: 175,
    hospedaje: 0,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Elio Caceros',
    route_name: 'San Marcos I #92',
    numeral: '#92',
    lugares_visitar: 'CATARINA, EL CARMEN, MALACATAN, TOCACHE, SAN RAFAEL PIE DE LA CUESTA, EL PORVERNIR, ALDEA SANJON',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Elio Caceros',
    route_name: 'San Marcos II #93',
    numeral: '#93',
    lugares_visitar: 'LA BLANCA, AYUTLA, EL CARMEN, MALACATAN, SAN LORENZO, PAJAPITA, SAN PABLO, ALDEA LIMONES, LIMONCITOS OCOS, CATARINA',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Elio Caceros',
    route_name: 'Capital S3 #94',
    numeral: '#94',
    lugares_visitar: 'ZONA 8, ZONA 3, ZONA 7, ZONA 4',
    combustible: 500,
    alimentacion: 175,
    hospedaje: 0,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Elio Caceros',
    route_name: 'Ixcán #95',
    numeral: '#95',
    lugares_visitar: 'ALDEA SONTE, XUCTZUL, TIERRA LINDA, LIMON NORTE, CHIQUIBUL, SAN JOSE ICBOLAY, PLAYITAS, IXCAN, SONORA, LOS OLIVOS',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },

  // --- Josue Aguilar (#A1 a #A5) ---
  {
    vendor: 'Josue Aguilar',
    route_name: 'Escuintla I #A1',
    numeral: '#A1',
    lugares_visitar: 'PUERTO SAN JOSE, IZTAPA, MONTERRICO, CUYUTA, MASAGUA, GUANAGAZAPA, ESCUINTLA, PALIN',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Josue Aguilar',
    route_name: 'Escuintla II #A2',
    numeral: '#A2',
    lugares_visitar: 'TIQUISATE, NUEVA CONCEPCION, LA GOMERA, EL SEMILLERO, SIPACATE, PATULUL, POCHUTA, SANTA LUCIA COTZUMALGUAPA, SANTA BARBARA, SIQUINALA',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Josue Aguilar',
    route_name: 'Villa Nueva #A3',
    numeral: '#A3',
    lugares_visitar: 'BARCENAS, SAN JOSE, LINDA VISTA, VILLA NUEVA',
    combustible: 600,
    alimentacion: 175,
    hospedaje: 0,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Josue Aguilar',
    route_name: 'Huehuetenango Centro #A4',
    numeral: '#A4',
    lugares_visitar: 'CHINACA, MALACATANCITO, AGUACATAN, SAN SEBASTIAN',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Josue Aguilar',
    route_name: 'Municipios Norte #A5',
    numeral: '#A5',
    lugares_visitar: 'Mixco San Raymundo, San Pedro Sacatepéquez, San Juan Sacatepéquez, Aldea Montufar',
    combustible: 600,
    alimentacion: 175,
    hospedaje: 0,
    fotocopias: 0,
    otros: 0
  },

  // --- Elias Quiej (#B1 a #B5) ---
  {
    vendor: 'Elias Quiej',
    route_name: 'Peten III #B1',
    numeral: '#B1',
    lugares_visitar: 'CHACTE, SAN LUIS, ALDEA EL PARACAIDISTA, POPTUN, SAN JUAN EL CHAL, AGRICULTORES UNIDOS, EL CHAL',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Elias Quiej',
    route_name: 'Peten IV #B2',
    numeral: '#B2',
    lugares_visitar: 'SANTA ANA, FLORES, SAN JOSE, EL REMATE, LA CAOBA, SACPUY, MACANCHE, MELCHOR DE MENCOS, PAXCAMAN, ALDEA EL NARANJO',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Elias Quiej',
    route_name: 'Transversal I #B3',
    numeral: '#B3',
    lugares_visitar: 'SAN FERNANDO CHAHAL, FRAY BARTOLOME DE LAS CASAS, BOLONCO, CHISEC',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Elias Quiej',
    route_name: 'Transversal II #B4',
    numeral: '#B4',
    lugares_visitar: 'CHISEC, RAXRUHA, FRAY BARTOLOME DE LAS CASAS',
    combustible: 1000,
    alimentacion: 445,
    hospedaje: 600,
    fotocopias: 0,
    otros: 0
  },
  {
    vendor: 'Elias Quiej',
    route_name: 'Amatitlán #B5',
    numeral: '#B5',
    lugares_visitar: 'AMATITLAN',
    combustible: 600,
    alimentacion: 175,
    hospedaje: 0,
    fotocopias: 0,
    otros: 0
  }
];

// Mapa rápido por nombre exacto y numeral para resolución instantánea
export const ROUTE_TEMPLATES_BY_NAME = {};
export const ROUTE_TEMPLATES_BY_NUMERAL = {};

OFFICIAL_ROUTE_VIATICOS_TEMPLATES.forEach(item => {
  ROUTE_TEMPLATES_BY_NAME[item.route_name] = item;
  if (item.numeral) {
    ROUTE_TEMPLATES_BY_NUMERAL[item.numeral.toUpperCase()] = item;
  }
});

/**
 * Busca y resuelve la plantilla de viáticos de una ruta por nombre o numeral (#XX).
 */
export function findRouteTemplate(routeName) {
  if (!routeName || typeof routeName !== 'string') return null;
  const clean = routeName.trim();

  // 1. Coincidencia exacta
  if (ROUTE_TEMPLATES_BY_NAME[clean]) {
    return ROUTE_TEMPLATES_BY_NAME[clean];
  }

  // 2. Coincidencia por numeral (ej: #11, #A1, #B3)
  const numMatch = clean.match(/#([A-Za-z0-9]+)/);
  if (numMatch) {
    const code = `#${numMatch[1].toUpperCase()}`;
    if (ROUTE_TEMPLATES_BY_NUMERAL[code]) {
      return ROUTE_TEMPLATES_BY_NUMERAL[code];
    }
  }

  // 3. Coincidencia normalizada insensible a tildes y mayúsculas
  const normSearch = clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  for (const template of OFFICIAL_ROUTE_VIATICOS_TEMPLATES) {
    const normName = template.route_name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (normName === normSearch || normName.includes(normSearch) || normSearch.includes(normName)) {
      return template;
    }
  }

  return null;
}

/**
 * Sincroniza y persiste todas las plantillas oficiales en Supabase (`route_templates`).
 */
export async function syncAllRouteTemplatesToSupabase() {
  try {
    const records = OFFICIAL_ROUTE_VIATICOS_TEMPLATES.map(t => ({
      route_name: t.route_name,
      lugares_visitar: t.lugares_visitar,
      combustible: t.combustible,
      alimentacion: t.alimentacion,
      hospedaje: t.hospedaje,
      fotocopias: t.fotocopias || 0,
      otros: t.otros || 0
    }));

    const { data, error } = await supabase
      .from('route_templates')
      .upsert(records, { onConflict: 'route_name' });

    if (error) {
      console.warn('Aviso upsert route_templates Supabase:', error.message);
    } else {
      console.log('✓ 52 plantillas de viáticos sincronizadas en Supabase');
    }
    return { success: !error, count: records.length };
  } catch (err) {
    console.warn('Error sincronizando route_templates:', err);
    return { success: false, error: err };
  }
}
