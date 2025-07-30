// modules/semantic.js

/**
 * Realiza el análisis semántico del AST.
 * Verifica la coherencia de tipos y el uso de variables.
 * @param {Object} ast - El Árbol de Sintaxis Abstracta generado por el parser.
 * @returns {Array<string>} Una lista de errores semánticos encontrados.
 */
export function analyzeSemantics(ast) {
  const errors = [];
  const env = new Map(); // Entorno: guarda variables y su tipo (simplificado)

  // Función auxiliar para recorrer el AST y realizar verificaciones
  function traverse(node) {
    if (!node) return;

    switch (node.type) {
      case "Program":
        node.body.forEach(traverse);
        break;
      case "LetDeclaration":
        // Verifica si la variable ya fue declarada en el mismo scope (simplificado)
        if (env.has(node.identifier)) {
          errors.push(`❌ Línea ${node.line}, columna ${node.column}: Variable "${node.identifier}" ya ha sido declarada.`);
        }

        // Inferir el tipo de la expresión asignada
        const exprType = getType(node.expression);
        env.set(node.identifier, exprType); // Almacena el tipo de la variable
        traverse(node.expression); // Continúa el recorrido en la expresión
        break;
      case "BinaryExpression":
        const leftType = getType(node.left);
        const rightType = getType(node.right);

        // Verificación de tipos para operaciones binarias (solo números por ahora)
        if (leftType !== 'int' || rightType !== 'int') {
          errors.push(`❌ Línea ${node.line}, columna ${node.column}: Operación '${node.operator}' requiere operandos de tipo 'int', pero se encontraron '${leftType}' y '${rightType}'.`);
        }
        traverse(node.left);
        traverse(node.right);
        break;
      case "NumberLiteral":
        // No hay verificación para literales numéricos, su tipo es 'int'
        break;
      case "Identifier":
        // Verifica si el identificador ha sido declarado
        if (!env.has(node.value)) {
          errors.push(`❌ Línea ${node.line}, columna ${node.column}: Variable "${node.value}" usada sin declarar.`);
        }
        break;
      // Puedes añadir más casos para otros tipos de nodos AST (e.g., funciones, if/else)
    }
  }

  // Función auxiliar para obtener el tipo de un nodo de expresión
  function getType(node) {
    if (!node) return 'unknown';
    switch (node.type) {
      case "NumberLiteral":
        return 'int';
      case "Identifier":
        return env.get(node.value) || 'unknown'; // Retorna el tipo del entorno o 'unknown'
      case "BinaryExpression":
        // Para simplificar, asumimos que las operaciones binarias entre ints resultan en int
        const leftType = getType(node.left);
        const rightType = getType(node.right);
        if (leftType === 'int' && rightType === 'int') {
          return 'int';
        }
        return 'unknown'; // Si los tipos no son int, el resultado es desconocido o un error
      default:
        return 'unknown';
    }
  }

  // Inicia el recorrido del AST
  traverse(ast);

  return errors.length ? errors : ["✅ Análisis semántico correcto. ¡Variables y tipos OK!"];
}
