// modules/parser.js

// Importamos el analizador léxico para obtener los tokens antes de empezar el parseo.
import { analyzeLexically } from './lexer.js';

/**
 * Clase para representar un error de sintaxis de manera más informativa.
 */
class SyntaxError extends Error {
  constructor(message, token) {
    super(message);
    this.name = "SyntaxError";
    this.token = token; // Almacenamos el token que causó el error para mejor depuración.
  }
}

/**
 * Implementa un analizador sintáctico (parser) descendente recursivo para un subconjunto de OCaml.
 * Su trabajo es tomar una lista plana de tokens y construir un árbol de sintaxis abstracta (AST)
 * que representa la estructura jerárquica del código.
 */
export class Parser {
  /**
   * @param {Array<Object>} tokens - La lista de tokens producida por el analizador léxico.
   */
  constructor(tokens) {
    this.tokens = tokens;
    this.currentTokenIndex = 0; // Índice del token actual que se está procesando.
    this.errors = []; // Array para almacenar errores que no son fatales.
  }

  /**
   * Obtiene el token actual sin avanzar el índice. Es como "mirar" el siguiente token.
   * @returns {Object|null} El token actual o null si se llegó al final.
   */
  peek() {
    if (this.currentTokenIndex < this.tokens.length) {
      return this.tokens[this.currentTokenIndex];
    }
    return null;
  }

  /**
   * Obtiene el token actual y avanza el índice. Es como "consumir" o "comerse" el token.
   * @returns {Object|null} El token actual o null si se llegó al final.
   */
  consume() {
    if (this.currentTokenIndex < this.tokens.length) {
      return this.tokens[this.currentTokenIndex++];
    }
    return null;
  }

  /**
   * Verifica si el token actual es del tipo y/o valor esperado, lo consume y lo devuelve.
   * Si no coincide, lanza un error de sintaxis fatal.
   * @param {string} expectedType - El tipo de token esperado (e.g., "Keyword", "Identifier").
   * @param {string} [expectedValue] - El valor específico del token esperado (e.g., "let", "=").
   * @returns {Object} El token consumido.
   * @throws {SyntaxError} Si el token actual no coincide con lo esperado.
   */
  expect(expectedType, expectedValue = null) {
    const token = this.peek();
    if (!token) {
      throw new SyntaxError(`Se esperaba ${expectedType}${expectedValue ? ` '${expectedValue}'` : ''} pero se encontró el final del archivo.`, null);
    }
    if (token.type === expectedType && (expectedValue === null || token.value === expectedValue)) {
      return this.consume();
    } else {
      throw new SyntaxError(`Se esperaba ${expectedType}${expectedValue ? ` '${expectedValue}'` : ''} pero se encontró '${token.value}' de tipo '${token.type}' en línea ${token.line}, columna ${token.column}.`, token);
    }
  }

  /**
   * Punto de entrada principal del parser.
   * Parsea un programa OCaml completo, que es una secuencia de declaraciones ('let')
   * o expresiones top-level.
   * @returns {Object} El nodo raíz del AST que representa el programa completo.
   */
  parseProgram() {
    const statements = [];
    while (this.peek()) {
      try {
        // Un programa consiste en una serie de sentencias.
        if (this.peek().type === "Keyword" && this.peek().value === "let") {
          statements.push(this.parseDeclaration());
        } else {
          // Si no es una declaración `let`, asumimos que es una expresión top-level.
          const expr = this.parseExpression();
          this.expect("Delimiter", ";;"); // Las expresiones top-level deben terminar con ';;'.
          statements.push({
            type: "TopLevelExpression",
            expression: expr,
            line: expr.line,
            column: expr.column
          });
        }
      } catch (error) {
        // Captura y reporta el error, luego intenta recuperarse para seguir parseando.
        this.errors.push(error);
        // Estrategia de recuperación de errores: Avanzamos hasta encontrar ';;' o el final del archivo.
        while (this.peek() && !(this.peek().type === "Delimiter" && this.peek().value === ";;") && this.peek().type !== "EOF") {
          this.consume();
        }
        if (this.peek() && this.peek().type === "Delimiter" && this.peek().value === ";;") {
          this.consume(); // Consumimos el ';;' para continuar con la siguiente sentencia.
        } else if (this.peek() === null) {
          break; // Salimos del bucle si llegamos al final del archivo.
        }
      }
    }
    return { type: "Program", body: statements };
  }

  /**
   * Parsea una declaración 'let'. Esto incluye tanto la asignación de variables
   * como la definición de funciones con parámetros.
   * @returns {Object} Un nodo AST de tipo `LetDeclaration` o `FunctionDeclaration`.
   */
  parseDeclaration() {
    this.expect("Keyword", "let");
    const identifierToken = this.expect("Identifier");
    const identifier = identifierToken.value;
    const params = [];

    // Verificamos si hay parámetros de función.
    while (this.peek() && this.peek().type === "Identifier" && this.peek().value !== "=") {
      params.push(this.consume().value);
    }

    this.expect("Symbol", "=");

    let expression;
    if (params.length > 0) {
      // Si hay parámetros, es una declaración de función.
      expression = this.parseExpression();
      this.expect("Delimiter", ";;");
      return {
        type: "FunctionDeclaration",
        name: identifier,
        params: params,
        body: expression,
        line: identifierToken.line,
        column: identifierToken.column
      };
    } else {
      // Si no hay parámetros, es una declaración 'let' normal.
      expression = this.parseExpression();
      this.expect("Delimiter", ";;");
      return {
        type: "LetDeclaration",
        identifier: identifier,
        expression: expression,
        line: identifierToken.line,
        column: identifierToken.column
      };
    }
  }

  /**
   * Parsea una expresión. Esta es la función principal que maneja la precedencia de operadores
   * y la recursión.
   * @returns {Object} Un nodo AST para la expresión.
   */
  parseExpression() {
    // Primero, verificamos si es una expresión `if-then-else`.
    if (this.peek() && this.peek().type === "Keyword" && this.peek().value === "if") {
      return this.parseIfExpression();
    }
    // Si no es un `if`, intentamos parsear una aplicación de función (currying).
    return this.parseApplicationExpression();
  }

  /**
   * Parsea una expresión `if-then-else`.
   * @returns {Object} Un nodo AST de tipo `IfExpression`.
   */
  parseIfExpression() {
    const ifToken = this.expect("Keyword", "if");
    const condition = this.parseExpression(); // La condición puede ser cualquier expresión.
    this.expect("Keyword", "then");
    const thenBranch = this.parseExpression();
    this.expect("Keyword", "else");
    const elseBranch = this.parseExpression();

    return {
      type: "IfExpression",
      condition: condition,
      thenBranch: thenBranch,
      elseBranch: elseBranch,
      line: ifToken.line,
      column: ifToken.column
    };
  }

  /**
   * Parsea aplicaciones de función. En OCaml, las aplicaciones son de alta precedencia
   * y se encadenan de izquierda a derecha. Por ejemplo, `f x y` se parsea como `((f x) y)`.
   * @returns {Object} Un nodo AST de tipo `ApplicationExpression` o el resultado de `parseAdditiveExpression`.
   */
  parseApplicationExpression() {
    let expr = this.parseAdditiveExpression(); // Empezamos con el siguiente nivel de precedencia.

    // En un bucle, seguimos parseando expresiones primarias (los argumentos) y las anidamos
    // en nodos `ApplicationExpression` mientras haya más tokens.
    while (this.peek() && (this.peek().type === "Number" || this.peek().type === "Identifier" || (this.peek().type === "Symbol" && this.peek().value === "("))) {
        const arg = this.parsePrimaryExpression();
        expr = {
            type: "ApplicationExpression",
            callee: expr, // El callee es la expresión que ya hemos parseado.
            argument: arg,
            line: expr.line,
            column: expr.column
        };
    }
    return expr;
  }


  /**
   * Parsea expresiones aditivas (suma, resta y comparaciones).
   * Este método implementa la precedencia de operadores: los operadores aditivos
   * tienen menor precedencia que los multiplicativos.
   * @returns {Object} Un nodo AST de tipo `BinaryExpression` o el resultado de `parseMultiplicativeExpression`.
   */
  parseAdditiveExpression() {
    // Primero parseamos el siguiente nivel de precedencia (multiplicación).
    let left = this.parseMultiplicativeExpression();

    // En un bucle, si encontramos un operador aditivo, creamos un nodo de expresión binaria
    // y continuamos parseando el lado derecho.
    while (this.peek() && (this.peek().value === "+" || this.peek().value === "-" || this.peek().value === ">" || this.peek().value === "=")) {
      const operatorToken = this.consume();
      const right = this.parseMultiplicativeExpression();
      left = {
        type: "BinaryExpression",
        operator: operatorToken.value,
        left: left,
        right: right,
        line: operatorToken.line,
        column: operatorToken.column
      };
    }
    return left;
  }

  /**
   * Parsea expresiones multiplicativas (multiplicación, división, módulo).
   * Tienen mayor precedencia que las expresiones aditivas.
   * @returns {Object} Un nodo AST de tipo `BinaryExpression` o el resultado de `parsePrimaryExpression`.
   */
  parseMultiplicativeExpression() {
    // Primero parseamos la expresión de mayor precedencia: la expresión primaria.
    let left = this.parsePrimaryExpression();

    while (this.peek() && (this.peek().value === "*" || this.peek().value === "/" || this.peek().value === "mod")) {
      const operatorToken = this.consume();
      const right = this.parsePrimaryExpression();
      left = {
        type: "BinaryExpression",
        operator: operatorToken.value,
        left: left,
        right: right,
        line: operatorToken.line,
        column: operatorToken.column
      };
    }
    return left;
  }

  /**
   * Parsea las expresiones más básicas (literales numéricos, literales de cadena,
   * identificadores, y expresiones entre paréntesis).
   * @returns {Object} Un nodo AST para la expresión más básica.
   * @throws {SyntaxError} Si el token actual no es lo que se espera.
   */
  parsePrimaryExpression() {
    const token = this.peek();
    if (!token) {
      throw new SyntaxError("Se esperaba un número, identificador, cadena o expresión entre paréntesis.", null);
    }

    if (token.type === "Number") {
      return { type: "NumberLiteral", value: parseFloat(this.consume().value), line: token.line, column: token.column };
    } else if (token.type === "String") {
      // Quitamos las comillas para obtener el valor de la cadena.
      const stringValue = this.consume().value.slice(1, -1);
      return { type: "StringLiteral", value: stringValue, line: token.line, column: token.column };
    } else if (token.type === "Identifier") {
      return { type: "Identifier", value: this.consume().value, line: token.line, column: token.column };
    } else if (token.type === "Symbol" && token.value === "(") {
      this.consume(); // Consumimos el '('.
      const expression = this.parseExpression(); // Parseamos la expresión que está dentro.
      this.expect("Symbol", ")"); // Esperamos el ')' de cierre.
      return expression; // Devolvemos el nodo de la expresión interna.
    } else {
      throw new SyntaxError(`Token inesperado: '${token.value}' de tipo '${token.type}' en línea ${token.line}, columna ${token.column}. Se esperaba un número, identificador, cadena o '('.`, token);
    }
  }
}

/**
 * Función auxiliar para analizar la sintaxis desde el código de entrada.
 * Este es el punto de entrada para usar el parser desde el exterior.
 * @param {string} code - El código fuente a analizar.
 * @returns {{ast: Object, errors: Array<string>}} Un objeto con el AST y la lista de errores.
 */
export function analyzeSyntax(code) {
  // Primero, obtenemos los tokens del lexer.
  const tokens = analyzeLexically(code);
  const parser = new Parser(tokens);
  let ast = null;
  let errors = [];

  try {
    ast = parser.parseProgram();
    errors = parser.errors;
  } catch (e) {
    // Si hay un error fatal que detiene el parser, lo capturamos aquí.
    errors.push(e.message);
    ast = null;
  }

  // Si no se encontró el delimitador final `;;`, podemos añadir un error aquí.
  if (tokens.length > 0 && !(tokens[tokens.length-1].type === "Delimiter" && tokens[tokens.length-1].value === ";;")) {
    errors.push(`❌ Se esperaba un delimitador final ';;' para la última sentencia.`);
  }

  return { ast, errors };
}
