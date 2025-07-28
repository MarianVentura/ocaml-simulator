// parser.js
export function analyzeSyntax(code) {
  const errors = [];

  const normalizedCode = code.replace(/\s+/g, " ").trim();

  // Verificación básica de estructuras let ... in
  const letPattern = /\blet\b\s+[\w]+\s*=?\s*.*?\bin\b/;
  const letMatch = normalizedCode.match(letPattern);

  if (!letMatch && normalizedCode.includes("let")) {
    errors.push("❌ Estructura 'let ... in' mal formada o incompleta.");
  }

  // Verificaciones extendidas
  checkParentheses(normalizedCode, errors);
  checkIfThenElse(normalizedCode, errors);
  checkMatchWith(normalizedCode, errors);
  checkFunExpressions(normalizedCode, errors);
  checkOperators(normalizedCode, errors);

  return errors;
}

// 🔍 Verifica paréntesis balanceados
function checkParentheses(code, errors) {
  let stack = [];

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    if (char === '(') {
      stack.push(i);
    } else if (char === ')') {
      if (stack.length === 0) {
        errors.push(`❌ Paréntesis de cierre ')' sin apertura en posición ${i}`);
      } else {
        stack.pop();
      }
    }
  }

  if (stack.length > 0) {
    errors.push(`❌ Paréntesis de apertura '(' sin cerrar en posición ${stack[0]}`);
  }
}

// 🔍 Verifica if ... then ... else
function checkIfThenElse(code, errors) {
  const ifMatches = [...code.matchAll(/\bif\b/g)];
  const thenMatches = [...code.matchAll(/\bthen\b/g)];
  const elseMatches = [...code.matchAll(/\belse\b/g)];

  if (
    ifMatches.length > 0 &&
    (ifMatches.length !== thenMatches.length || thenMatches.length !== elseMatches.length)
  ) {
    errors.push("❌ Estructura condicional incompleta. Asegúrate de usar 'if ... then ... else' correctamente.");
  }
}

// 🔍 Verifica match ... with
function checkMatchWith(code, errors) {
  const matchCount = (code.match(/\bmatch\b/g) || []).length;
  const withCount = (code.match(/\bwith\b/g) || []).length;

  if (matchCount !== withCount) {
    errors.push("❌ Estructura 'match ... with' incompleta o desequilibrada.");
  }
}

// 🔍 Verifica fun x -> ...
function checkFunExpressions(code, errors) {
  const funCount = (code.match(/\bfun\b/g) || []).length;
  const correctFunMatches = (code.match(/fun\s+\w+\s*->/g) || []).length;

  if (funCount > 0 && correctFunMatches !== funCount) {
    errors.push("❌ Función 'fun' mal formada. Usa el formato: fun x -> expresión.");
  }
}

// 🔍 Verifica operadores sueltos o duplicados
function checkOperators(code, errors) {
  const operatorPattern = /[+\-*/=]{2,}/g;
  const matches = code.match(operatorPattern);
  if (matches) {
    errors.push(`❌ Operadores mal usados o duplicados detectados: ${matches.join(', ')}`);
  }
}
