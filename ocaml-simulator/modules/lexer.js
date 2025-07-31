// modules/lexer.js

/**
 * Realiza el análisis léxico del código fuente OCaml.
 * Divide el código en una secuencia de tokens (unidades léxicas)
 * que son reconocibles por el analizador sintáctico.
 * @param {string} code - El código fuente OCaml a analizar.
 * @returns {Array<Object>} Una lista de tokens, cada uno con tipo, valor, línea y columna.
 */
export function analyzeLexically(code) {
  // Lista de palabras clave de OCaml que el lexer debe reconocer.
  // Se añadieron 'if', 'then', 'else' para dar soporte a las expresiones condicionales.
  const keywords = ["let", "in", "fun", "match", "with", "if", "then", "else", "rec"];

  const tokens = []; // Este array almacenará los tokens resultantes.

  // Dividimos el código en líneas para poder rastrear con precisión la línea y columna
  // de cada token, lo cual es útil para reportar errores.
  const lines = code.split('\n');

  lines.forEach((line, lineIndex) => {
    let match;
    // La expresión regular es la parte más crítica del lexer.
    // Su objetivo es capturar todos los posibles tipos de tokens en una sola pasada.
    // El orden de los elementos en la regex es importante para que coincida primero
    // con los tokens más específicos, como las palabras clave.
    // 
    // - \b(?:let|in|fun|...|mod)\b: Captura palabras clave y el operador 'mod' como palabras completas.
    // - |;;: Captura el delimitador de sentencia.
    // - |"(?:[^"\\]|\\.)*": Captura literales de cadena de texto, incluyendo caracteres escapados como \".
    // - |\b\d+\b: Captura números enteros.
    // - |\b[a-zA-Z_]\w*\b: Captura identificadores válidos (empiezan con letra o _, seguido de letras, números o _).
    // - |[+\-*\/=<>!:]: Captura símbolos y operadores.
    // La bandera 'g' (global) asegura que se encuentren todas las coincidencias en la línea.
    const regex = /\b(?:let|in|fun|match|with|if|then|else|rec|mod)\b|;;|"(?:[^"\\]|\\.)*"|\b\d+\b|\b[a-zA-Z_]\w*\b|[+\-*\/=<>!:]/g;
    
    // Iteramos sobre la línea buscando todas las coincidencias.
    while ((match = regex.exec(line)) !== null) {
      const word = match[0]; // El texto capturado por la expresión regular (el valor del token).
      const column = match.index + 1; // La columna donde comienza el token, indexada desde 1.

      let type; // Variable para almacenar el tipo de token.

      // Clasificamos el token según su valor.
      // Las comprobaciones más específicas van primero para evitar ambigüedades.
      if (keywords.includes(word)) {
        type = "Keyword"; // Si el texto coincide con una palabra clave definida.
      } else if (word === ";;") {
        type = "Delimiter"; // Si es el delimitador de sentencia de OCaml.
      } else if (word.startsWith('"') && word.endsWith('"')) {
        type = "String"; // Si el texto empieza y termina con comillas dobles.
      } else if (word === "mod") {
        type = "Keyword"; // 'mod' se maneja como una palabra clave/operador.
      }
      else if (!isNaN(word) && word.trim() !== '') {
        type = "Number"; // Si el valor es un número válido.
      } else if (/^[a-zA-Z_]\w*$/.test(word)) {
        type = "Identifier"; // Si coincide con el patrón de un identificador.
      } else {
        type = "Symbol"; // Si no es ninguno de los anteriores, se asume que es un símbolo u operador.
      }

      // Añadimos el token al array de resultados.
      tokens.push({
        type,
        value: word,
        line: lineIndex + 1, // La línea actual, indexada desde 1.
        column
      });
    }
  });

  return tokens; // Devolvemos la lista completa de tokens generados.
}
