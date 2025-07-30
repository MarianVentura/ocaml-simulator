// app.js

import { analyzeLexically } from './modules/lexer.js';
import { analyzeSyntax } from './modules/parser.js';
import { analyzeSemantics } from './modules/semantic.js';
import { interpret } from './modules/interpreter.js';


const executionHistory = [];  // Aquí almacenamos las últimas ejecuciones
const maxHistory = 5;         // Número máximo de ejecuciones guardadas
let semanticAnalysisRun = false; // Bandera para controlar si el análisis semántico se ha ejecutado

// --- Números de línea simulados ---
const codeInput = document.getElementById('codeInput');
const lineNumbers = document.getElementById('lineNumbers');
const resultText = document.getElementById('resultText');
const astText = document.getElementById('astText');
const errorText = document.getElementById('errorText');

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

  if (!tokens.length && inputCode.trim() !== '') {
    resultText.innerHTML = `<p class="text-red-400">❌ No se encontraron tokens.</p>`;
    showTab('resultText');
    return;
  } else if (inputCode.trim() === '') {
    resultText.innerHTML = `<p class="text-gray-400">Escribe código y presiona "Léxico" para comenzar...</p>`;
    showTab('resultText');
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

  resultText.innerHTML = output;
  showTab('resultText', document.querySelector('button[onclick="showTab(\'resultText\', this)"]'));
  saveExecutionInHistory(); // Puedes decidir si guardar solo los resultados finales o cada paso
};

window.runSyntaxAnalysis = () => {
  const inputCode = codeInput.value;
  const { ast, errors } = analyzeSyntax(inputCode); // analyzeSyntax ahora devuelve AST y errores

  semanticAnalysisRun = false; // Reinicia la bandera semántica

  if (errors.length > 0) {
    // Si hay errores, muéstralos en la pestaña de errores
    errorText.innerHTML = errors
      .map((err, i) => `<strong>Error Sintáctico ${i + 1}:</strong> ${err}`)
      .join('<br><br>');
    showTab('errorText', document.querySelector('button[onclick="showTab(\'errorText\', this)"]'));
    astText.textContent = '[AST no disponible debido a errores sintácticos]'; // Limpia el AST si hay errores
    resultText.innerHTML = `<p class="text-red-400">❌ Análisis Sintáctico: Fallido. Verifique la pestaña de Errores.</p>`;
  } else {
    // Si no hay errores, muestra el AST en la pestaña AST y un mensaje de éxito en resultados
    astText.textContent = JSON.stringify(ast, null, 2); // Formatea el AST para mejor lectura
    resultText.innerHTML = `<p class="text-green-400">✅ Análisis Sintáctico: Correcto. Se ha construido el Árbol de Sintaxis Abstracta (AST).</p>`;
    showTab('astText', document.querySelector('button[onclick="showTab(\'astText\', this)"]'));
  }
};

window.runSemanticAnalysis = () => {
  const inputCode = codeInput.value;
  const { ast, errors: syntaxErrors } = analyzeSyntax(inputCode);

  semanticAnalysisRun = true; // Establece la bandera para el análisis semántico

  if (syntaxErrors.length > 0 || !ast) {
    // Si hay errores sintácticos, no se puede realizar el análisis semántico
    errorText.innerHTML = `<p class="text-red-400">❌ Análisis Semántico: No se puede realizar debido a errores sintácticos previos. Verifique la pestaña de Errores.</p>`;
    showErrors(syntaxErrors.map(err => `Error Sintáctico: ${err}`)); // Muestra los errores sintácticos en la pestaña de errores
    showTab('errorText', document.querySelector('button[onclick="showTab(\'errorText\', this)"]'));
    return;
  }

  const semanticErrors = analyzeSemantics(ast); // Pasa el AST al análisis semántico

  if (semanticErrors.length > 0 && !(semanticErrors.length === 1 && semanticErrors[0].includes("✅ Análisis semántico correcto"))) {
    // Si hay errores semánticos, muéstralos
    showErrors(semanticErrors);
    showTab('errorText', document.querySelector('button[onclick="showTab(\'errorText\', this)"]'));
  } else {
    // Si no hay errores semánticos, muestra un mensaje de éxito
    errorText.innerHTML = `<p class="text-green-400">✅ Análisis semántico correcto. ¡Variables y tipos OK!</p>`;
    showTab('errorText', document.querySelector('button[onclick="showTab(\'errorText\', this)"]'));
  }
};

window.runInterpretation = () => {
  const inputCode = codeInput.value;
  const { ast, errors: syntaxErrors } = analyzeSyntax(inputCode);

  if (syntaxErrors.length > 0 || !ast) {
    resultText.innerHTML = `<p class="text-red-400">❌ Ejecución: No se puede ejecutar el código debido a errores sintácticos. Verifique la pestaña de Errores.</p>`;
    showTab('resultText', document.querySelector('button[onclick="showTab(\'resultText\', this)"]'));
    return;
  }

  const semanticErrors = analyzeSemantics(ast);
  if (semanticErrors.length > 0 && !(semanticErrors.length === 1 && semanticErrors[0].includes("✅ Análisis semántico correcto"))) {
    resultText.innerHTML = `<p class="text-red-400">❌ Ejecución: No se puede ejecutar el código debido a errores semánticos. Verifique la pestaña de Errores.</p>`;
    showTab('resultText', document.querySelector('button[onclick="showTab(\'resultText\', this)"]'));
    return;
  }

  const interpretationResult = interpret(ast); // Pasa el AST al intérprete
  resultText.textContent = interpretationResult;
  showTab('resultText', document.querySelector('button[onclick="showTab(\'resultText\', this)"]'));
};

function showErrors(errors) {
  // Asegúrate de que el contenedor de errores esté visible
  const errorTextElement = document.getElementById('errorText');

  if (!errors || errors.length === 0 || (errors.length === 1 && errors[0].includes("✅ Análisis semántico correcto"))) {
    errorTextElement.innerHTML = "✅ No se encontraron errores.";
    return;
  }

  errorTextElement.innerHTML = errors
    .map((err, i) => `<strong>Error ${i + 1}:</strong> ${err}`)
    .join('<br><br>');
}

window.clearAll = () => {
  codeInput.value = '';
  lineNumbers.textContent = '1';
  resultText.innerHTML = `Escribe código y presiona "Léxico" para comenzar...`;
  astText.innerHTML = `[AST aparecerá aquí]`;
  errorText.innerHTML = `⚠️ Por favor, presiona ‘Semántico’ para ver los errores.`;
  semanticAnalysisRun = false; // Reinicia la bandera
  codeInput.focus();
  showTab('resultText', document.querySelector('button[onclick="showTab(\'resultText\', this)"]')); // Vuelve a la pestaña de resultados
};

window.showTab = (tabId, buttonElement) => {
  const tabsContent = ['resultText', 'astText', 'errorText'];

  tabsContent.forEach(id => {
    document.getElementById(id).classList.toggle('hidden', id !== tabId);
  });

  document.querySelectorAll('button.tab').forEach(btn => {
    btn.classList.remove('tab-active');
    // Restablece los estilos inline para los botones inactivos
    btn.style.color = getComputedStyle(document.documentElement).getPropertyValue('--tab-inactive-text-light');
    btn.style.borderColor = 'transparent';
    if (document.documentElement.classList.contains('dark')) {
      btn.style.color = getComputedStyle(document.documentElement).getPropertyValue('--tab-inactive-text-dark');
    }
  });

  if (buttonElement) {
    buttonElement.classList.add('tab-active');
    // Aplica los estilos inline para el botón activo
    buttonElement.style.color = getComputedStyle(document.documentElement).getPropertyValue('--tab-active-text-light');
    buttonElement.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--tab-active-border-light');
    if (document.documentElement.classList.contains('dark')) {
      buttonElement.style.color = getComputedStyle(document.documentElement).getPropertyValue('--tab-active-text-dark');
      buttonElement.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--tab-active-border-dark');
    }
  }
};

// Función para guardar el historial de ejecución (puedes expandirla para guardar más detalles)
function saveExecutionInHistory() {
  // Implementación de historial si es necesaria
  // const currentCode = codeInput.value;
  // executionHistory.unshift({ code: currentCode, timestamp: new Date() });
  // if (executionHistory.length > maxHistory) {
  //   executionHistory.pop();
  // }
}
