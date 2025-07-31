// modules/interpreter.js

/**
 * Representa un valor de función (closure) en el intérprete.
 * Una clausura es una función junto con el entorno en el que fue creada.
 * Esto es crucial para la correcta implementación de funciones curried y
 * de funciones que "recuerdan" las variables de su entorno de definición.
 */
class OCamlFunction {
  constructor(params, body, closureEnv) {
    this.params = params; // Los nombres de los parámetros de la función.
    this.body = body;     // El nodo AST que representa el cuerpo de la función.
    this.closureEnv = closureEnv; // El entorno (closure) donde se definió la función.
  }

  /**
   * Aplica la función a un argumento.
   * Este método gestiona el currying, devolviendo una nueva función si aún
   * faltan parámetros, o evaluando el cuerpo si se ha recibido el último.
   * @param {*} argValue - El valor del argumento que se está aplicando.
   * @param {Map} currentEnv - El entorno actual de la llamada, no de la definición.
   * @returns {OCamlFunction|*} Una nueva función si es aplicación parcial, o el resultado final de la evaluación del cuerpo.
   */
  apply(argValue, currentEnv) {
    // Si la función espera más de un parámetro, devolvemos una nueva función con
    // el primer parámetro "atado" a su valor.
    if (this.params.length > 1) {
      const newParams = this.params.slice(1); // Parámetros restantes.
      const newClosureEnv = new Map(this.closureEnv); // Copia el entorno de la clausura.
      newClosureEnv.set(this.params[0], argValue); // Atamos el primer parámetro al valor.
      return new OCamlFunction(newParams, this.body, newClosureEnv);
    } else {
      // Si este es el último parámetro (o el único), evaluamos el cuerpo de la función.
      const callEnv = new Map(this.closureEnv); // Creamos un nuevo entorno de llamada, basándonos en la clausura.
      callEnv.set(this.params[0], argValue); // Atamos el último parámetro al valor.

      // Creamos un intérprete temporal para evaluar el cuerpo de la función
      // con el entorno de llamada modificado.
      const tempInterpreter = new Interpreter(this.body, callEnv);
      return tempInterpreter.evaluate(this.body);
    }
  }
}

/**
 * Clase del intérprete para evaluar el Árbol de Sintaxis Abstracta (AST).
 * Realiza un recorrido post-orden del árbol, evaluando cada nodo y devolviendo
 * un valor.
 */
class Interpreter {
  /**
   * @param {Object} ast - El AST completo o un sub-árbol a interpretar.
   * @param {Map} [initialEnv] - Un entorno inicial. Esto es útil para las clausuras,
   * que necesitan un entorno preexistente.
   */
  constructor(ast, initialEnv = new Map()) {
    this.ast = ast;
    this.env = initialEnv; // El entorno es un mapa que almacena variables y sus valores.
  }

  /**
   * Evalúa un nodo del AST de forma recursiva. El tipo de nodo determina la
   * acción a realizar.
   * @param {Object} node - El nodo AST a evaluar.
   * @returns {*} El valor resultante de la evaluación (número, cadena, función, etc.).
   * @throws {Error} Si ocurre un error de ejecución (ej. variable no definida, división por cero).
   */
  evaluate(node) {
    if (!node) {
      throw new Error("Error de interpretación: Nodo AST nulo o indefinido.");
    }

    switch (node.type) {
      case "Program":
        let programResult = "";
        for (const statement of node.body) {
          try {
            const result = this.evaluate(statement);
            // Formateamos la salida de manera similar a cómo lo haría un REPL de OCaml.
            if (statement.type === "LetDeclaration") {
                programResult += `val ${statement.identifier} : ${typeof result === 'number' ? 'int' : typeof result === 'string' ? 'string' : 'unknown'} = ${result}\n`;
            } else if (statement.type === "FunctionDeclaration") {
                // Para las funciones, solo mostramos la firma (simplificado).
                programResult += `val ${statement.name} : ${'fun'} = <fun>\n`; 
            } else if (statement.type === "TopLevelExpression") {
                programResult += `val it : ${typeof result === 'number' ? 'int' : typeof result === 'string' ? 'string' : 'unknown'} = ${result}\n`;
            } else {
                programResult += `${result}\n`;
            }
          } catch (e) {
            // Capturamos errores de sentencias individuales para poder continuar
            // si el programa tiene más código después del error.
            programResult += `❌ Error en línea ${statement.line}, columna ${statement.column}: ${e.message}\n`;
          }
        }
        return programResult.trim(); // Eliminamos el último salto de línea.

      case "LetDeclaration":
        const value = this.evaluate(node.expression); // Evaluamos la expresión asignada.
        this.env.set(node.identifier, value); // Almacenamos el valor en el entorno.
        return value; // Devolvemos el valor para su impresión.

      case "FunctionDeclaration":
        // Creamos una nueva clausura que contiene los parámetros, el cuerpo y el entorno actual.
        const func = new OCamlFunction(node.params, node.body, new Map(this.env));
        this.env.set(node.name, func); // Almacenamos la función en el entorno bajo su nombre.
        return func;

      case "ApplicationExpression":
        const callee = this.evaluate(node.callee); // Evaluamos la expresión de la función a llamar.
        const argument = this.evaluate(node.argument); // Evaluamos el argumento.

        if (!(callee instanceof OCamlFunction)) {
          throw new Error(`Se intentó aplicar a un valor que no es una función.`);
        }
        // Llamamos al método `apply` de la clausura con el argumento.
        return callee.apply(argument, this.env);

      case "BinaryExpression":
        const left = this.evaluate(node.left);
        const right = this.evaluate(node.right);

        if (typeof left !== 'number' || typeof right !== 'number') {
          throw new Error(`Operación '${node.operator}' requiere operandos de tipo 'int', pero se encontraron '${typeof left}' y '${typeof right}'.`);
        }

        switch (node.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': 
            if (right === 0) {
              throw new Error(`División por cero.`);
            }
            return Math.floor(left / right); // OCaml usa división entera.
          case 'mod':
            if (right === 0) {
              throw new Error(`Módulo por cero.`);
            }
            return left % right;
          case '>': return left > right ? 1 : 0; // Representamos booleanos con 1 (verdadero) y 0 (falso).
          case '=': return left === right ? 1 : 0;
          default:
            throw new Error(`Operador desconocido: ${node.operator}`);
        }

      case "IfExpression":
        const conditionResult = this.evaluate(node.condition);
        // La condición se considera verdadera si el resultado no es 0.
        if (conditionResult !== 0) {
          return this.evaluate(node.thenBranch);
        } else {
          return this.evaluate(node.elseBranch);
        }

      case "NumberLiteral":
        return node.value;

      case "StringLiteral":
        return node.value;
      
      case "Identifier":
        const idValue = this.env.get(node.value);
        if (idValue === undefined) {
          throw new Error(`Variable "${node.value}" no definida.`);
        }
        return idValue;

      case "TopLevelExpression":
        // Simplemente evaluamos la expresión contenida y devolvemos el resultado.
        return this.evaluate(node.expression);

      default:
        throw new Error(`Tipo de nodo AST desconocido para interpretación: ${node.type}`);
    }
  }
}

/**
 * Punto de entrada para la interpretación.
 * Esta función inicializa el intérprete y maneja el nivel más alto de
 * errores de ejecución.
 * @param {Object} ast - El AST a interpretar.
 * @returns {string} El resultado de la interpretación o un mensaje de error.
 */
export function interpret(ast) {
  const interpreter = new Interpreter(ast);
  try {
    return interpreter.evaluate(ast);
  } catch (error) {
    return `❌ Error de ejecución: ${error.message}`;
  }
}
