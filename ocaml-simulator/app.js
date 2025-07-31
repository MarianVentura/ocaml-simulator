// app.js

// Importamos las funciones principales desde sus módulos correspondientes.
// Estas funciones se encargan de las diferentes etapas del proceso de compilación y ejecución.
import { analyzeLexically } from './modules/lexer.js';
import { analyzeSyntax } from './modules/parser.js';
import { analyzeSemantics } from './modules/semantic.js';
import { interpret } from './modules/interpreter.js';


// ----------------- Variables de estado y constantes -----------------
const executionHistory = [];  // Array para almacenar un historial de las últimas ejecuciones.
const maxHistory = 5;         // Límite máximo de ejecuciones que se guardarán en el historial.
let semanticAnalysisRun = false; // Una bandera para saber si el análisis semántico ya se ejecutó. Esto es útil para decidir qué mostrar en la pestaña de errores.


// ----------------- Referencias a elementos del DOM -----------------
// Obtenemos las referencias a los elementos HTML con los que interactuaremos.
const codeInput = document.getElementById('codeInput'); // El textarea donde el usuario escribe el código.
const lineNumbers = document.getElementById('lineNumbers'); // El div que muestra los números de línea.
const resultText = document.getElementById('resultText'); // El div para mostrar los resultados de la ejecución.
const astText = document.getElementById('astText'); // El div para mostrar el Árbol de Sintaxis Abstracta (AST).
const errorText = document.getElementById('errorText'); // El div para mostrar los errores.


// ----------------- Funciones de utilidades para la UI -----------------
/**
 * Actualiza el contenido del div de números de línea para que coincida con el número de líneas
 * del textarea de código.
 */
function updateLineNumbers() {
  const lines = codeInput.value.split('\n').length;
  // Creamos un array del tamaño de las líneas, lo llenamos con 0s y luego mapeamos
  // cada elemento a su índice + 1 para obtener la numeración.
  lineNumbers.textContent = Array(lines).fill(0).map((_, i) => i + 1).join('\n');
}

/**
 * Sincroniza el scroll del div de números de línea con el scroll del textarea de código.
 */
function syncScroll() {
  lineNumbers.scrollTop = codeInput.scrollTop;
}


// ----------------- Gestión de eventos iniciales -----------------
// Cuando la página se cargue, inicializamos los números de línea.
window.addEventListener('DOMContentLoaded', () => {
  updateLineNumbers();
});

// Cuando el usuario escribe, actualizamos los números de línea.
codeInput.addEventListener('input', updateLineNumbers);
// Cuando el usuario hace scroll en el textarea, sincronizamos el scroll de los números de línea.
codeInput.addEventListener('scroll', syncScroll);
// Cuando el usuario hace scroll en los números de línea (poco probable pero por seguridad),
// sincronizamos el scroll del textarea.
lineNumbers.addEventListener('scroll', () => {
  codeInput.scrollTop = lineNumbers.scrollTop;
});


// ----------------- Funciones principales de análisis y ejecución (expuestas en `window`) -----------------

/**
 * Función para ejecutar el análisis léxico.
 * Analiza el código de entrada, lo divide en tokens y muestra el resultado en una tabla.
 */
window.runLexicalAnalysis = () => {
  const inputCode = codeInput.value;
  // Llama a la función de análisis léxico desde el módulo `lexer.js`.
  const tokens = analyzeLexically(inputCode);

  // Manejamos casos especiales: si no hay tokens pero el código no está vacío, o si el código está vacío.
  if (!tokens.length && inputCode.trim() !== '') {
    resultText.innerHTML = `<p class="text-red-400">❌ No se encontraron tokens.</p>`;
    showTab('resultText');
    return;
  } else if (inputCode.trim() === '') {
    resultText.innerHTML = `<p class="text-gray-400">Escribe código y presiona "Léxico" para comenzar...</p>`;
    showTab('resultText');
    return;
  }

  // Construimos una tabla HTML para mostrar los tokens de manera estructurada.
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

  // Iteramos sobre cada token y agregamos una fila a la tabla.
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

  // Insertamos la tabla en el div de resultados y mostramos la pestaña.
  resultText.innerHTML = output;
  showTab('resultText', document.querySelector('button[onclick="showTab(\'resultText\', this)"]'));
  saveExecutionInHistory(); // Guardamos el resultado de la ejecución en el historial.
};

/**
 * Función para ejecutar el análisis sintáctico.
 * Analiza la secuencia de tokens para construir un Árbol de Sintaxis Abstracta (AST).
 * Si hay errores sintácticos, los muestra. Si no, muestra el AST.
 */
window.runSyntaxAnalysis = () => {
  const inputCode = codeInput.value;
  // Llama a la función de análisis sintáctico. Devuelve el AST y cualquier error encontrado.
  const { ast, errors } = analyzeSyntax(inputCode);

  semanticAnalysisRun = false; // Reiniciamos la bandera de análisis semántico.

  if (errors.length > 0) {
    // Si se encontraron errores, los mostramos en la pestaña de errores.
    errorText.innerHTML = errors
      .map((err, i) => `<strong>Error Sintáctico ${i + 1}:</strong> ${err}`)
      .join('<br><br>');
    showTab('errorText', document.querySelector('button[onclick="showTab(\'errorText\', this)"]'));
    // Limpiamos el AST, ya que no se pudo construir correctamente.
    astText.textContent = '[AST no disponible debido a errores sintácticos]';
    resultText.innerHTML = `<p class="text-red-400">❌ Análisis Sintáctico: Fallido. Verifique la pestaña de Errores.</p>`;
  } else {
    // Si no hay errores, mostramos el AST formateado en la pestaña AST.
    astText.textContent = JSON.stringify(ast, null, 2);
    resultText.innerHTML = `<p class="text-green-400">✅ Análisis Sintáctico: Correcto. Se ha construido el Árbol de Sintaxis Abstracta (AST).</p>`;
    showTab('astText', document.querySelector('button[onclick="showTab(\'astText\', this)"]'));
  }
};

/**
 * Función para ejecutar el análisis semántico.
 * Este paso verifica la coherencia de tipos y el uso de variables, requiriendo un AST válido.
 */
window.runSemanticAnalysis = () => {
  const inputCode = codeInput.value;
  // Primero, re-ejecutamos el análisis sintáctico para obtener el AST más reciente.
  const { ast, errors: syntaxErrors } = analyzeSyntax(inputCode);

  semanticAnalysisRun = true; // Establecemos la bandera para indicar que el análisis semántico se ha corrido.

  if (syntaxErrors.length > 0 || !ast) {
    // Si el análisis sintáctico falló, no podemos continuar. Mostramos un error.
    errorText.innerHTML = `<p class="text-red-400">❌ Análisis Semántico: No se puede realizar debido a errores sintácticos previos. Verifique la pestaña de Errores.</p>`;
    showErrors(syntaxErrors.map(err => `Error Sintáctico: ${err}`));
    showTab('errorText', document.querySelector('button[onclick="showTab(\'errorText\', this)"]'));
    return;
  }

  // Si el AST es válido, llamamos a la función de análisis semántico.
  const semanticErrors = analyzeSemantics(ast);

  // Verificamos si se encontraron errores semánticos (excluyendo el mensaje de éxito).
  if (semanticErrors.length > 0 && !(semanticErrors.length === 1 && semanticErrors[0].includes("✅ Análisis semántico correcto"))) {
    // Si hay errores, los mostramos.
    showErrors(semanticErrors);
    showTab('errorText', document.querySelector('button[onclick="showTab(\'errorText\', this)"]'));
  } else {
    // Si no hay errores, mostramos un mensaje de éxito.
    errorText.innerHTML = `<p class="text-green-400">✅ Análisis semántico correcto. ¡Variables y tipos OK!</p>`;
    showTab('errorText', document.querySelector('button[onclick="showTab(\'errorText\', this)"]'));
  }
};

/**
 * Función para ejecutar el intérprete.
 * Primero valida que no existan errores sintácticos ni semánticos, luego ejecuta el AST.
 */
window.runInterpretation = () => {
  const inputCode = codeInput.value;
  const { ast, errors: syntaxErrors } = analyzeSyntax(inputCode);

  // Verificamos primero si hay errores sintácticos.
  if (syntaxErrors.length > 0 || !ast) {
    resultText.innerHTML = `<p class="text-red-400">❌ Ejecución: No se puede ejecutar el código debido a errores sintácticos. Verifique la pestaña de Errores.</p>`;
    showTab('resultText', document.querySelector('button[onclick="showTab(\'resultText\', this)"]'));
    return;
  }

  // Luego, verificamos si hay errores semánticos.
  const semanticErrors = analyzeSemantics(ast);
  if (semanticErrors.length > 0 && !(semanticErrors.length === 1 && semanticErrors[0].includes("✅ Análisis semántico correcto"))) {
    resultText.innerHTML = `<p class="text-red-400">❌ Ejecución: No se puede ejecutar el código debido a errores semánticos. Verifique la pestaña de Errores.</p>`;
    showTab('resultText', document.querySelector('button[onclick="showTab(\'resultText\', this)"]'));
    return;
  }

  // Si no hay errores, llamamos al intérprete para que evalúe el AST.
  const interpretationResult = interpret(ast);
  resultText.textContent = interpretationResult;
  showTab('resultText', document.querySelector('button[onclick="showTab(\'resultText\', this)"]'));
};


// ----------------- Funciones de control de la UI -----------------

/**
 * Muestra los errores de forma formateada en la pestaña de errores.
 * @param {Array<string>} errors - La lista de errores a mostrar.
 */
function showErrors(errors) {
  const errorTextElement = document.getElementById('errorText');

  if (!errors || errors.length === 0 || (errors.length === 1 && errors[0].includes("✅ Análisis semántico correcto"))) {
    errorTextElement.innerHTML = "✅ No se encontraron errores.";
    return;
  }

  // Mapea los errores para darles un formato de lista con negrita.
  errorTextElement.innerHTML = errors
    .map((err, i) => `<strong>Error ${i + 1}:</strong> ${err}`)
    .join('<br><br>');
}

/**
 * Restablece la interfaz de usuario a su estado inicial.
 * Limpia el editor, los resultados, el AST y los errores.
 */
window.clearAll = () => {
  codeInput.value = '';
  lineNumbers.textContent = '1'; // Resetea los números de línea a solo '1'.
  resultText.innerHTML = `Escribe código y presiona "Léxico" para comenzar...`;
  astText.innerHTML = `[AST aparecerá aquí]`;
  errorText.innerHTML = `⚠️ Por favor, presiona ‘Semántico’ para ver los errores.`;
  semanticAnalysisRun = false; // Reinicia la bandera.
  codeInput.focus(); // Devuelve el foco al editor de código.
  // Vuelve a mostrar la pestaña de resultados.
  showTab('resultText', document.querySelector('button[onclick="showTab(\'resultText\', this)"]'));
};

/**
 * Controla la visibilidad de las pestañas de resultados.
 * @param {string} tabId - El ID de la pestaña a mostrar.
 * @param {HTMLElement} buttonElement - El botón de la pestaña que se ha clicado.
 */
window.showTab = (tabId, buttonElement) => {
  // Lista de los IDs de todas las pestañas.
  const tabsContent = ['resultText', 'astText', 'errorText'];

  // Iteramos sobre las pestañas y mostramos solo la que corresponde al `tabId`.
  tabsContent.forEach(id => {
    document.getElementById(id).classList.toggle('hidden', id !== tabId);
  });

  // Iteramos sobre todos los botones de pestaña.
  document.querySelectorAll('button.tab').forEach(btn => {
    btn.classList.remove('tab-active');
    // Restablece los estilos inline para los botones inactivos.
    btn.style.color = getComputedStyle(document.documentElement).getPropertyValue('--tab-inactive-text-light');
    btn.style.borderColor = 'transparent';
    if (document.documentElement.classList.contains('dark')) {
      btn.style.color = getComputedStyle(document.documentElement).getPropertyValue('--tab-inactive-text-dark');
    }
  });

  // Si se proporcionó un botón, le aplicamos la clase y los estilos de pestaña activa.
  if (buttonElement) {
    buttonElement.classList.add('tab-active');
    // Aplica los estilos inline para el botón activo.
    buttonElement.style.color = getComputedStyle(document.documentElement).getPropertyValue('--tab-active-text-light');
    buttonElement.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--tab-active-border-light');
    if (document.documentElement.classList.contains('dark')) {
      buttonElement.style.color = getComputedStyle(document.documentElement).getPropertyValue('--tab-active-text-dark');
      buttonElement.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--tab-active-border-dark');
    }
  }
};

/**
 * Función placeholder para guardar el historial de ejecución.
 * La implementación está comentada, pero sirve como ejemplo de dónde
 * se podría añadir la lógica para guardar ejecuciones pasadas.
 */
function saveExecutionInHistory() {
  // Implementación de historial si es necesaria.
  // const currentCode = codeInput.value;
  // executionHistory.unshift({ code: currentCode, timestamp: new Date() });
  // if (executionHistory.length > maxHistory) {
  //   executionHistory.pop();
  // }
}
