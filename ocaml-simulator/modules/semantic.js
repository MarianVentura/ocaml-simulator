export function analyzeSemantics(code) {
  const errors = [];
  const env = {}; // Entorno: guarda variables y su tipo (simplificado)
  
  // Dividir código en líneas para analizar
  const lines = code.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  lines.forEach((line, index) => {
    // Detectar declaraciones let simples (sin rec por ahora)
    const letMatch = line.match(/^let\s+(rec\s+)?(\w+)\s*=\s*(.+)\s*(in)?$/);
    if (letMatch) {
      const isRec = !!letMatch[1];
      const varName = letMatch[2];
      const expr = letMatch[3];
      
      // Simple inferencia tipo: si expr es número, tipo int
      if (/^\d+$/.test(expr)) {
        env[varName] = 'int';
      } else if (expr.startsWith('fun')) {
        env[varName] = 'function';
      } else if (env[expr]) {
        env[varName] = env[expr]; // Copia tipo si existe
      } else {
        // No sabemos el tipo, pero guardamos igual
        env[varName] = 'unknown';
      }
    }
    
    // Validar uso de variables: verificar que las variables usadas estén en el entorno
    // Extraemos tokens para buscar identificadores
    const tokens = line.match(/\b\w+\b/g) || [];
    tokens.forEach(token => {
      // Ignoramos palabras clave y números
      if (['let', 'in', 'fun', 'rec', 'if', 'then', 'else', 'match', 'with'].includes(token)) return;
      if (/^\d+$/.test(token)) return;
      
      // Verificamos si está declarado
      if (!(token in env)) {
        errors.push(`❌ Línea ${index + 1}: Variable "${token}" usada sin declarar.`);
      }
    });
  });

  return errors.length ? errors : ["✅ Análisis semántico correcto. ¡Variables y tipos OK!"];
}
