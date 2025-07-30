// modules/parser.js

/**
 * Clase para representar un error de sintaxis.
 */
class SyntaxError extends Error {
  constructor(message, token) {
    super(message);
    this.name = "SyntaxError";
    this.token = token; // Almacena el token que causó el error para mejor depuración.
  }
}

/**
 * Implementa un analizador sintáctico (parser) para un subconjunto de OCaml.
 * Toma una lista de tokens y construye un Árbol de Sintaxis Abstracta (AST).
 */
export class Parser {
  /**
   * @param {Array<Object>} tokens - La lista de tokens del analizador léxico.
   */
  constructor(tokens) {
    this.tokens = tokens;
    this.currentTokenIndex = 0; // Índice del token actual que se está procesando.
    this.errors = []; // Array para almacenar errores de sintaxis
  }

  /**
   * Obtiene el token actual sin avanzar el índice.
   * @returns {Object|null} El token actual o null si se llegó al final.
   */
  peek() {
    if (this.currentTokenIndex < this.tokens.length) {
      return this.tokens[this.currentTokenIndex];
    }
    return null;
  }

  /**
   * Obtiene el token actual y avanza el índice al siguiente.
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
   * Si no coincide, lanza un error de sintaxis.
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
   * Parsea un programa OCaml completo (secuencia de declaraciones).
   * @returns {Object} El nodo raíz del AST que representa el programa.
   * @throws {SyntaxError} Si se encuentra un error de sintaxis.
   */
  parseProgram() {
    const declarations = [];
    while (this.peek()) {
      try {
        declarations.push(this.parseDeclaration());
      } catch (error) {
        // Captura el error para reportarlo y luego intenta sincronizarse
        // para continuar parseando si es posible.
        this.errors.push(error);
        // Implementación simple de recuperación de errores:
        // Avanza hasta encontrar un delimitador de sentencia (;;) o el final
        while (this.peek() && !(this.peek().type === "Delimiter" && this.peek().value === ";;") && this.peek().type !== "EOF") {
          this.consume();
        }
        if (this.peek() && this.peek().type === "Delimiter" && this.peek().value === ";;") {
          this.consume(); // Consume el ';;' para avanzar
        }
      }
    }
    return { type: "Program", body: declarations };
  }

  /**
   * Parsea una declaración (e.g., let binding).
   * @returns {Object} Un nodo AST para la declaración.
   * @throws {SyntaxError}
   */
  parseDeclaration() {
    // Espera la palabra clave 'let'
    this.expect("Keyword", "let");
    const identifier = this.expect("Identifier"); // Espera un identificador para la variable.
    this.expect("Symbol", "="); // Espera el símbolo '='.

    // Parsea la expresión asignada a la variable.
    const expression = this.parseExpression();

    // Espera el delimitador de declaración ';;'.
    this.expect("Delimiter", ";;");

    return {
      type: "LetDeclaration",
      identifier: identifier.value,
      expression: expression,
      line: identifier.line,
      column: identifier.column
    };
  }

  /**
   * Parsea una expresión (maneja la precedencia de operadores).
   * Implementa el algoritmo Shunting-yard o un parser de precedencia para expresiones.
   * Por simplicidad, aquí se usa un enfoque de precedencia directa (suma/resta, luego multiplicación/división).
   * @returns {Object} Un nodo AST para la expresión.
   * @throws {SyntaxError}
   */
  parseExpression() {
    return this.parseAdditiveExpression(); // Empieza con la expresión de menor precedencia.
  }

  /**
   * Parsea expresiones aditivas (suma y resta).
   * @returns {Object} Un nodo AST.
   */
  parseAdditiveExpression() {
    let left = this.parseMultiplicativeExpression(); // Primero parsea el siguiente nivel de precedencia.

    while (this.peek() && (this.peek().value === "+" || this.peek().value === "-")) {
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
   * Parsea expresiones multiplicativas (multiplicación y división).
   * @returns {Object} Un nodo AST.
   */
  parseMultiplicativeExpression() {
    let left = this.parsePrimaryExpression(); // Primero parsea la expresión primaria.

    while (this.peek() && (this.peek().value === "*" || this.peek().value === "/")) {
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
   * Parsea las expresiones más básicas (números, identificadores, paréntesis).
   * @returns {Object} Un nodo AST.
   * @throws {SyntaxError}
   */
  parsePrimaryExpression() {
    const token = this.peek();
    if (!token) {
      throw new SyntaxError("Se esperaba un número, identificador o expresión entre paréntesis.", null);
    }

    if (token.type === "Number") {
      return { type: "NumberLiteral", value: parseFloat(this.consume().value), line: token.line, column: token.column };
    } else if (token.type === "Identifier") {
      return { type: "Identifier", value: this.consume().value, line: token.line, column: token.column };
    } else if (token.type === "Symbol" && token.value === "(") {
      this.consume(); // Consume '('
      const expression = this.parseExpression();
      this.expect("Symbol", ")"); // Espera ')'
      return expression; // Devuelve la expresión dentro de los paréntesis.
    } else {
      throw new SyntaxError(`Token inesperado: '${token.value}' de tipo '${token.type}' en línea ${token.line}, columna ${token.column}. Se esperaba un número, identificador o '('.`, token);
    }
  }
}

// Función auxiliar para analizar la sintaxis desde el código de entrada
export function analyzeSyntax(code) {
  const tokens = analyzeLexically(code); // Primero, realiza el análisis léxico
  const parser = new Parser(tokens);
  let ast = null;
  let errors = [];

  try {
    ast = parser.parseProgram();
    errors = parser.errors; // Recoge los errores que el parser pudo haber encontrado y recuperado
  } catch (e) {
    // Si hay un error fatal que detiene el parser
    errors.push(e.message);
    ast = null; // Asegúrate de que AST sea null si hay un error fatal
  }

  return { ast, errors };
}

// Importa analyzeLexically para que analyzeSyntax pueda usarlo
import { analyzeLexically } from './lexer.js';
