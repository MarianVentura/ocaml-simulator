// modules/lexer.js

/**
 * Realiza el análisis léxico del código fuente OCaml.
 * Divide el código en una secuencia de tokens (unidades léxicas).
 * @param {string} code - El código fuente OCaml a analizar.
 * @returns {Array<Object>} Una lista de tokens, cada uno con tipo, valor, línea y columna.
 */
export function analyzeLexically(code) {
  // Lista de palabras clave de OCaml que el lexer debe reconocer.
  const keywords = ["let", "in", "fun", "match", "with", "if", "then", "else", "rec"];

  const tokens = []; // Array para almacenar los tokens resultantes.

  // Divide el código fuente en líneas para un seguimiento preciso de la línea y columna.
  const lines = code.split('\n');

  lines.forEach((line, lineIndex) => {
    let match;
    // Expresión regular mejorada para capturar todos los tipos de tokens:
    // 1. Palabras clave específicas (let, in, fun, etc.)
    // 2. Delimitador ;; (¡Ahora reconocido como una unidad!)
    // 3. Números (\b\d+\b)
    // 4. Identificadores (\b[a-zA-Z_]\w*\b)
    // 5. Operadores y símbolos comunes (¡Ahora incluye + y * correctamente!)
    //    Se usa una alternancia más específica para operadores de múltiples caracteres primero,
    //    luego operadores de un solo carácter.
    const regex = /\b(?:let|in|fun|match|with|if|then|else|rec)\b|;;|\b\d+\b|\b[a-zA-Z_]\w*\b|[+\-*\/=<>!:]/g;
    
    // Itera sobre la línea buscando coincidencias con la expresión regular.
    while ((match = regex.exec(line)) !== null) {
      const word = match[0]; // El texto capturado por la expresión regular.
      const column = match.index + 1; // La columna donde comienza el token (basado en 1).

      let type; // El tipo de token (Keyword, Number, Identifier, Symbol, Delimiter).

      // Clasifica el token basándose en su valor.
      if (keywords.includes(word)) {
        type = "Keyword"; // Si la palabra está en la lista de palabras clave.
      } else if (word === ";;") {
        type = "Delimiter"; // Si es el delimitador de expresión OCaml.
      } else if (!isNaN(word) && word.trim() !== '') { // Verifica si es un número. `trim()` para evitar espacios.
        type = "Number";
      } else if (/^[a-zA-Z_]\w*$/.test(word)) {
        type = "Identifier"; // Si es un identificador válido (empieza con letra o _, seguido de letras, números o _).
      } else {
        type = "Symbol"; // Cualquier otra cosa que la regex capturó (operadores, otros símbolos).
      }

      // Añade el token al array de tokens.
      tokens.push({
        type,
        value: word,
        line: lineIndex + 1, // La línea actual (basado en 1).
        column
      });
    }
  });

  return tokens; // Devuelve la lista completa de tokens.
}
