# 🧠 OCaml Simulator — Proyecto Final: Lenguajes de Programación

**Simulador interactivo de código OCaml**, desarrollado con **JavaScript + HTML/CSS** como proyecto final de la asignatura **Lenguajes de Programación**.

Esta aplicación permite **analizar, validar y simular código fuente en OCaml** de manera visual, procesando cada una de las etapas fundamentales de un compilador de lenguajes funcionales.

---

## 🔍 ¿Qué hace esta app?

- **Análisis léxico**  
  Identifica los *tokens* del lenguaje (como `let`, `in`, `fun`, etc.).

- **Análisis sintáctico**  
  Verifica que la estructura del código respete la gramática de OCaml.

- **Análisis semántico**  
  Evalúa tipos, variables, y coherencia lógica entre los elementos.

- **Ejecución / Simulación**  
  Interpreta el código y muestra resultados en tiempo real o paso a paso.

- **Gestión de errores**  
  Muestra mensajes claros y precisos ante errores de sintaxis o lógica.

---

## 🛠️ Tecnologías usadas

- **JavaScript** (modularizado por etapas del análisis)
- **HTML + CSS** (interfaz visual responsiva)
- **TailwindCSS** *(opcional, para estilos personalizados)*

---

## 📁 Estructura del proyecto

```bash
ocaml-simulator/
│
├── index.html         # 🌐 Interfaz visual (UI)
├── style.css          # 🎨 Estilos de la página
├── app.js             # 🧠 Lógica principal (JS)
│
├── /modules           # 🧩 Archivos separados para cada análisis
│   ├── lexer.js       # 🔍 Análisis léxico
│   ├── parser.js      # 🏗️ Análisis sintáctico
│   ├── semantic.js    # 🧠 Análisis semántico
│   └── interpreter.js # ⚙️ Ejecución / Simulación
│
└── /assets            # 🖼️ Imágenes, íconos, recursos extra
```
---
## 🎓 Créditos académicos
*Este proyecto fue desarrollado como trabajo final para la asignatura Lenguajes de Programación, en el marco de la carrera de Ingeniería de Sistemas.*
