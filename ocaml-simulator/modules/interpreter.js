// modules/interpreter.js

/**
 * Interpreta el Árbol de Sintaxis Abstracta (AST) para ejecutar el código.
 * @param {Object} ast - El Árbol de Sintaxis Abstracta.
 * @returns {string} El resultado de la interpretación o un mensaje de error.
 */
export function interpret(ast) {
  const env = new Map(); // Entorno: almacena variables y sus valores

  // Función auxiliar para evaluar nodos del AST
  function evaluate(node) {
    if (!node) {
      throw new Error("Error de interpretación: Nodo AST nulo o indefinido.");
    }

    switch (node.type) {
      case "Program":
        let programResult = "";
        for (const declaration of node.body) {
          programResult += evaluate(declaration) + "\n"; // Evalúa cada declaración
        }
        return programResult.trim(); // Elimina el último salto de línea
      case "LetDeclaration":
        const value = evaluate(node.expression); // Evalúa la expresión asignada
        env.set(node.identifier, value); // Almacena el valor en el entorno
        return `val ${node.identifier} : ${typeof value === 'number' ? 'int' : 'unknown'} = ${value}`;
      case "BinaryExpression":
        const left = evaluate(node.left);
        const right = evaluate(node.right);

        if (typeof left !== 'number' || typeof right !== 'number') {
          throw new Error(`Error de tipo en línea ${node.line}, columna ${node.column}: Operación '${node.operator}' requiere números.`);
        }

        switch (node.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': 
            if (right === 0) {
              throw new Error(`Error en línea ${node.line}, columna ${node.column}: División por cero.`);
            }
            return left / right;
          default:
            throw new Error(`Operador desconocido: ${node.operator}`);
        }
      case "NumberLiteral":
        return node.value;
      case "Identifier":
        if (!env.has(node.value)) {
          throw new Error(`Error en línea ${node.line}, columna ${node.column}: Variable "${node.value}" no definida.`);
        }
        return env.get(node.value);
      default:
        throw new Error(`Tipo de nodo AST desconocido para interpretación: ${node.type}`);
    }
  }

  try {
    return evaluate(ast);
  } catch (error) {
    return `❌ Error de ejecución: ${error.message}`;
  }
}
