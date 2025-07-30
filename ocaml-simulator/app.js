import { analyzeLexically } from './modules/lexer.js';
import { analyzeSyntax } from './modules/parser.js';
import { analyzeSemantics } from './modules/semantic.js';
import { interpret } from './modules/interpreter.js';

let semanticAnalysisRun = false;

// --- Números de línea simulados ---
const codeInput = document.getElementById('codeInput');
const lineNumbers = document.getElementById('lineNumbers');

function updateLineNumbers() {
  const lines = codeInput.value.split('\n').length;
  lineNumbers.textContent = Array(lines).fill(0).map((_, i) => i + 1).join('\n');
}

function syncScroll() {
  lineNumbers.scrollTop = codeInput.scrollTop;
}

// Inicializar números de línea al cargar la página
window.addEventListener('DOMContentLoaded', () => {
  updateLineNumbers();
});

// Actualizar números y sincronizar scroll con el textarea
codeInput.addEventListener('input', updateLineNumbers);
codeInput.addEventListener('scroll', syncScroll);
lineNumbers.addEventListener('scroll', () => {
  codeInput.scrollTop = lineNumbers.scrollTop;
});


// --- Funciones principales de análisis ---
window.runLexicalAnalysis = () => {
  const inputCode = codeInput.value;
  const tokens = analyzeLexically(inputCode);

  if (!tokens.length) {
    document.getElementById("resultText").innerHTML = `<p class="text-red-400">❌ No se encontraron tokens.</p>`;
    return;
  }

  let output = `
    <div class="overflow-x-auto">
      <table class="min-w-full table-auto border border-gray-700 text-sm text-left text-gray-300">
        <thead class="bg-gray-800 text-gray-100">
          <tr>
            <th class="px-4 py-2 border border-gray-700">📍 Línea</th>
            <th class="px-4 py-2 border border-gray-700">📌 Columna</th>
            <th class="px-4 py-2 border border-gray-700">🔠 Tipo</th>
            <th class="px-4 py-2 border border-gray-700">🧩 Lexema</th>
          </tr>
        </thead>
        <tbody class="bg-gray-900">
  `;

  tokens.forEach(token => {
    output += `
      <tr class="hover:bg-gray-800 transition-colors duration-150">
        <td class="px-4 py-2 border border-gray-700">${token.line}</td>
        <td class="px-4 py-2 border border-gray-700">${token.column}</td>
        <td class="px-4 py-2 border border-gray-700">${token.type}</td>
        <td class="px-4 py-2 border border-gray-700 font-mono text-yellow-300">"${token.value}"</td>
      </tr>
    `;
  });

  output += `
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("resultText").innerHTML = output;
};

window.runSyntaxAnalysis = () => {
  const inputCode = codeInput.value;
  const result = analyzeSyntax(inputCode);

  if (result.errors) {
    document.getElementById("resultText").textContent = result.errors.join('\n');
  } else {
    document.getElementById("resultText").textContent = "❌ Error desconocido en el análisis sintáctico.";
  }

  console.log("AST:", result.ast);
};

window.runSemanticAnalysis = () => {
  const code = codeInput.value;
  const result = analyzeSemantics(code);

  semanticAnalysisRun = true;
  showErrors(result);
  showTab('errorText');
};

window.runInterpretation = () => {
  const code = codeInput.value;
  const result = interpret(code);
  document.getElementById('resultText').textContent = result;
};

function showErrors(errors) {
  const errorText = document.getElementById('errorText');

  if (!semanticAnalysisRun) {
    errorText.innerHTML = "⚠️ Por favor, presiona ‘Semántico’ para ver los errores.";
    return;
  }

  if (!errors || errors.length === 0) {
    errorText.innerHTML = "✅ No se encontraron errores.";
    return;
  }

  errorText.innerHTML = errors
    .map((err, i) => `<strong>Error ${i + 1}:</strong> ${err}`)
    .join('<br><br>');
}