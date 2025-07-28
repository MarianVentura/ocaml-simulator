export function interpret(code) {
  // Para simplificar, vamos a interpretar expresiones muy básicas.
  // Lo ideal sería construir el AST y evaluarlo, pero haremos un parseo directo para empezar.

  // Ejemplo mínimo: evaluar let bindings y sumas simples
  const env = {};

  // Extraemos todas las declaraciones let ... in ... en orden
  const letExprs = code.match(/let\s+(\w+)\s*=\s*(.+?)\s+in/g);

  if (!letExprs) return "❌ No se encontraron expresiones let válidas.";

  let lastResult = null;

  for (const expr of letExprs) {
    // extraemos nombre y valor
    const match = expr.match(/let\s+(\w+)\s*=\s*(.+?)\s+in/);
    if (!match) continue;

    const name = match[1];
    let valueExpr = match[2].trim();

    // evaluar valor (número o suma simple)
    let value;
    if (/^\d+$/.test(valueExpr)) {
      value = parseInt(valueExpr);
    } else if (/(\w+)\s*\+\s*(\w+)/.test(valueExpr)) {
      // sumar variables o números
      const parts = valueExpr.split('+').map(s => s.trim());
      const left = env[parts[0]] ?? parseInt(parts[0]);
      const right = env[parts[1]] ?? parseInt(parts[1]);
      if (left === undefined || right === undefined) return `❌ Variable no definida en suma: ${valueExpr}`;
      value = left + right;
    } else {
      // Valor complejo, simplificado como string
      value = valueExpr;
    }

    env[name] = value;
    lastResult = value;
  }

  return `✅ Resultado final: ${lastResult}`;
}
