using System;
using System.Collections.Generic;
using System.Text;
using OcamlCompiler.Lexing;
using OcamlCompiler.Parsing;
using OcamlCompiler.Semantics;

class Program
{
    static void Main()
    {
        while (true)
        {
            Console.Clear();
            Console.WriteLine("=== Compilador OCaml (Lexer + Parser + Semántico) ===");
            Console.WriteLine("Introduce el código OCaml a analizar (ENTER dos veces para terminar):");

            string line;
            bool lastLineEmpty = false;
            var codeBuilder = new StringBuilder();

            while (true)
            {
                line = Console.ReadLine();
                if (string.IsNullOrWhiteSpace(line))
                {
                    if (lastLineEmpty) break;
                    lastLineEmpty = true;
                }
                else
                {
                    lastLineEmpty = false;
                    codeBuilder.AppendLine(line);
                }
            }

            string code = codeBuilder.ToString();

            var lexer = new OcamlLexer(code);
            var tokensRaw = lexer.Tokenize();
            var tokens = new List<Token>(tokensRaw);

            ImprimirTokens(tokens);

            Console.WriteLine("\n--- Análisis Sintáctico (Parser) ---");
            var parser = new Parser(tokens);

            Expr parsedExpr;
            try
            {
                parsedExpr = parser.ParseExpr();
                Console.WriteLine($"Expresión válida: {parsedExpr.GetType().Name}");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ Error de sintaxis: {ex.Message}");
                Console.ResetColor();
                Console.WriteLine("\nPresiona una tecla para intentar de nuevo...");
                Console.ReadKey();
                continue;
            }

            Console.WriteLine("\n--- Análisis Semántico ---");
            var analyzer = new SemanticAnalyzer();

            try
            {
                analyzer.Analyze(parsedExpr);
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ Error semántico: {ex.Message}");
                Console.ResetColor();
            }

            Console.WriteLine("\nPresiona una tecla para analizar otro código o Ctrl+C para salir...");
            Console.ReadKey();
        }
    }

    static void ImprimirTokens(List<Token> tokens)
    {
        Console.WriteLine("\n--- Tokens encontrados (Lexer) ---\n");
        foreach (var t in tokens)
        {
            if (t.Type == TokenType.Error)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"Error léxico en línea {t.Line}, col {t.Column}: token inválido '{t.Lexeme}'");
                Console.ResetColor();
            }
            else
            {
                Console.WriteLine($"{t.Line}:{t.Column} {t.Type} → '{t.Lexeme}'");
            }
        }
    }
}