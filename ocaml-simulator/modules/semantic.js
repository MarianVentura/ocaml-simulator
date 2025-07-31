// modules/semantic.js

/**
 * Realiza el análisis semántico del AST.
 * Verifica la coherencia de tipos y el uso de variables.
 * @param {Object} ast - El Árbol de Sintaxis Abstracta generado por el parser.
 * @returns {Array<string>} Una lista de errores semánticos encontrados.
 */
export function analyzeSemantics(ast) {
  // Array para almacenar los errores semánticos que se encuentren.
  const errors = [];
  // El "entorno" (`env`) es nuestra tabla de símbolos. Almacena los tipos de variables y
  // las firmas de las funciones para verificar su uso correcto en el código.
  const env = new Map();

  /**
   * Función auxiliar recursiva para recorrer el AST y realizar verificaciones.
   * Actúa como un "visitador" que se desplaza por los nodos del árbol.
   * @param {Object} node - El nodo actual del AST a visitar.
   */
  function traverse(node) {
    if (!node) return; // Si el nodo es nulo, no hacemos nada y terminamos la recursión.

    // Usamos un `switch` para manejar la lógica de verificación específica para cada tipo de nodo.
    switch (node.type) {
      case "Program":
        // Para el nodo raíz "Program", simplemente recorremos todos los nodos de su cuerpo.
        node.body.forEach(traverse);
        break;
      case "LetDeclaration":
        // Verificamos si la variable ya fue declarada en el mismo alcance (scope).
        if (env.has(node.identifier)) {
          errors.push(`❌ Línea ${node.line}, columna ${node.column}: Variable "${node.identifier}" ya ha sido declarada.`);
        }

        // Inferimos el tipo de la expresión asignada a la variable.
        const exprType = getType(node.expression);
        // Almacenamos el identificador y su tipo en nuestra tabla de símbolos (`env`).
        env.set(node.identifier, exprType);
        // Continuamos el recorrido en la expresión para analizarla también.
        traverse(node.expression);
        break;
      case "FunctionDeclaration":
        // Verificamos si la función ya fue declarada.
        if (env.has(node.name)) {
          errors.push(`❌ Línea ${node.line}, columna ${node.column}: Función "${node.name}" ya ha sido declarada.`);
        }
        // Almacenamos la firma de la función en el entorno. `arity` se usa para validar el número de argumentos.
        env.set(node.name, { type: 'function', arity: node.params.length, params: node.params });

        // Creamos un nuevo entorno para el cuerpo de la función. Esto simula un nuevo scope.
        const functionEnv = new Map(env); // Copia el entorno actual.
        // Agregamos los parámetros de la función al nuevo entorno local.
        node.params.forEach(param => {
          if (functionEnv.has(param)) {
            errors.push(`❌ Línea ${node.line}, columna ${node.column}: Parámetro "${param}" ya existe en este scope de función.`);
          }
          // Por simplicidad, asumimos que todos los parámetros son de tipo 'int' por ahora.
          functionEnv.set(param, 'int');
        });

        // Guardamos el entorno global temporalmente y lo reemplazamos por el de la función.
        const originalEnv = new Map(env); // Usamos `new Map()` para una copia profunda.
        env.clear(); // Limpiamos el entorno actual
        functionEnv.forEach((value, key) => env.set(key, value)); // Copiamos el nuevo entorno.

        // Analizamos el cuerpo de la función dentro de su propio entorno.
        traverse(node.body);

        // Al salir de la función, restauramos el entorno original (el global).
        env.clear();
        originalEnv.forEach((value, key) => env.set(key, value));
        break;
      case "ApplicationExpression":
        // Recorremos el callee (la función) y el argumento.
        traverse(node.callee);
        traverse(node.argument);

        // Obtenemos el tipo del callee y verificamos si es una función.
        const calleeType = getType(node.callee);
        if (calleeType.type !== 'function') {
          errors.push(`❌ Línea ${node.line}, columna ${node.column}: Se intentó aplicar a un valor que no es una función.`);
        } else {
          // Simplificado: por ahora solo verificamos si el callee es una función.
          // En OCaml, las aplicaciones pueden ser parciales (currying), lo cual requeriría
          // un sistema de tipos más complejo.
        }
        break;
      case "BinaryExpression":
        // Obtenemos los tipos de los operandos izquierdo y derecho.
        const leftType = getType(node.left);
        const rightType = getType(node.right);

        // Verificamos que los operandos sean de tipo 'int' para operaciones binarias.
        if (['+', '-', '*', '/', 'mod', '>', '='].includes(node.operator)) {
          if (leftType !== 'int' || rightType !== 'int') {
            errors.push(`❌ Línea ${node.line}, columna ${node.column}: Operación '${node.operator}' requiere operandos de tipo 'int', pero se encontraron '${leftType}' y '${rightType}'.`);
          }
        }
        // Continuamos el recorrido en ambos operandos.
        traverse(node.left);
        traverse(node.right);
        break;
      case "IfExpression":
        // Recorremos la condición y ambas ramas (`then` y `else`).
        traverse(node.condition);
        traverse(node.thenBranch);
        traverse(node.elseBranch);

        const conditionType = getType(node.condition);
        // OCaml espera un booleano para la condición de un `if`. Aquí, representamos los booleanos
        // con 'int' (0 para falso, cualquier otro valor para verdadero).
        if (node.condition.type === "BinaryExpression" && ['>', '='].includes(node.condition.operator)) {
          // Si la condición es una comparación, se asume que es "booleana".
        } else if (conditionType !== 'int') {
          errors.push(`❌ Línea ${node.condition.line}, columna ${node.condition.column}: La condición de un 'if' debe ser una expresión booleana (o int en este simulador), pero se encontró '${conditionType}'.`);
        }

        const thenType = getType(node.thenBranch);
        const elseType = getType(node.elseBranch);

        // Verificamos que las ramas `then` y `else` tengan el mismo tipo para que el `if` sea válido.
        if (thenType !== elseType) {
          errors.push(`⚠️ Línea ${node.line}, columna ${node.column}: Las ramas 'then' (${thenType}) y 'else' (${elseType}) de un 'if' deben tener tipos compatibles.`);
        }
        break;
      case "NumberLiteral":
        // No hay verificaciones, su tipo es 'int'.
        break;
      case "StringLiteral":
        // No hay verificaciones, su tipo es 'string'.
        break;
      case "Identifier":
        // Verificamos si el identificador (`node.value`) ha sido declarado en el entorno actual.
        if (!env.has(node.value)) {
          errors.push(`❌ Línea ${node.line}, columna ${node.column}: Variable "${node.value}" usada sin declarar.`);
        }
        break;
      case "TopLevelExpression":
        // Recorremos la expresión principal del programa.
        traverse(node.expression);
        break;
    }
  }

  /**
   * Función auxiliar para obtener el tipo de un nodo de expresión.
   * Utiliza el entorno (`env`) para resolver los tipos de los identificadores.
   * @param {Object} node - El nodo de expresión.
   * @returns {string|Object} El tipo del nodo ('int', 'string', o un objeto para funciones).
   */
  function getType(node) {
    if (!node) return 'unknown';
    switch (node.type) {
      case "NumberLiteral":
        return 'int';
      case "StringLiteral":
        return 'string';
      case "Identifier":
        // Buscamos el identificador en el entorno para obtener su tipo.
        const idInfo = env.get(node.value);
        return idInfo ? (idInfo.type === 'function' ? idInfo : idInfo) : 'unknown';
      case "BinaryExpression":
        // Las comparaciones (`>` y `=`) resultan en un tipo booleano, que aquí representamos con 'int'.
        if (['>', '='].includes(node.operator)) {
          return 'int';
        }
        // Para otras operaciones, el tipo del resultado depende de los operandos.
        const leftType = getType(node.left);
        const rightType = getType(node.right);
        if (leftType === 'int' && rightType === 'int') {
          return 'int';
        }
        return 'unknown';
      case "IfExpression":
        // El tipo de una expresión `if` es el tipo común de sus ramas `then` y `else`.
        const thenType = getType(node.thenBranch);
        const elseType = getType(node.elseBranch);
        if (thenType === elseType) {
          return thenType;
        }
        return 'unknown';
      case "FunctionDeclaration":
        // Si el nodo es una declaración de función, obtenemos su firma del entorno.
        return env.get(node.name) || 'unknown';
      case "ApplicationExpression":
        // Para una aplicación de función, asumimos que el tipo resultante es 'int' por ahora.
        const calleeFuncInfo = getType(node.callee);
        if (calleeFuncInfo && calleeFuncInfo.type === 'function') {
          return 'int';
        }
        return 'unknown';
      default:
        // Si el tipo de nodo no es reconocido, devolvemos 'unknown'.
        return 'unknown';
    }
  }

  // Comienza el recorrido del AST desde el nodo raíz.
  traverse(ast);

  // Filtramos el mensaje de éxito si ya hay otros errores.
  const filteredErrors = errors.filter(err => !err.includes("✅ Análisis semántico correcto"));
  // Si no hay errores, devolvemos el mensaje de éxito.
  return filteredErrors.length ? filteredErrors : ["✅ Análisis semántico correcto. ¡Variables y tipos OK!"];
}
