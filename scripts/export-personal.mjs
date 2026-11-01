// Gera rotina-pessoal.json (formato de backup do Hibi) a partir de js/personal.js,
// para importar a sua rotina em outro aparelho: Ajustes → Importar rotina.
// Uso: npm run export-personal   (o arquivo gerado fica fora do git)
import { writeFileSync } from 'node:fs';
import { WEEK } from '../js/personal.js';
import { exportJson } from '../js/store.js';
import { sanitizeWeek } from '../js/model.js';

const { week } = sanitizeWeek(WEEK);
writeFileSync(new URL('../rotina-pessoal.json', import.meta.url), exportJson(week));
console.log(`rotina-pessoal.json criado com ${week.length} blocos.`);
