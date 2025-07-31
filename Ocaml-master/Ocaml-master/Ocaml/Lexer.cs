using System;
using System.Collections.Generic;
using System.Text;

namespace OcamlCompiler.Lexing
{
    public enum TokenType
    {
        Keyword, Identifier, BacktickIdent,
        Int, Float,
        String, Char,
        Operator, Delimiter,
        Comment,
        Error, EOF
    }

    public class Token
    {
        public TokenType Type { get; }
        public string Lexeme { get; }
        public int Line { get; }
        public int Column { get; }

        public Token(TokenType type, string lexeme, int line, int column)
        {
            Type = type;
            Lexeme = lexeme;
            Line = line;
            Column = column;
        }

        public override string ToString() => $"{Type} '{Lexeme}' ({Line}:{Column})";
    }

    public class OcamlLexer
    {
        private static readonly HashSet<string> Keywords = new()
        {
            "let", "in", "match", "with", "fun", "type", "if", "then", "else", "rec", "module", "open", "and", "or", "exception", "try"
        };

        private readonly string source;
        private int index = 0;
        private int line = 1;
        private int col = 1;

        public OcamlLexer(string source)
        {
            this.source = source;
        }

        public IEnumerable<Token> Tokenize()
        {
            while (!IsAtEnd())
            {
                SkipWhitespace();

                int startLine = line;
                int startCol = col;

                if (IsAtEnd()) break;

                char c = Peek();

                // Comentarios anidados (* ... *)
                if (c == '(' && PeekNext() == '*')
                {
                    string comment = ReadNestedComment();
                    if (comment == null)
                    {
                        yield return new Token(TokenType.Error, "Comentario no cerrado", startLine, startCol);
                        yield break;
                    }
                    else
                    {
                        yield return new Token(TokenType.Comment, comment, startLine, startCol);
                        continue;
                    }
                }

                // Strings con escapes
                if (c == '"')
                {
                    string str = ReadString();
                    if (str == null)
                        yield return new Token(TokenType.Error, "Cadena no cerrada o inválida", startLine, startCol);
                    else
                        yield return new Token(TokenType.String, str, startLine, startCol);
                    continue;
                }

                // Caracteres con escapes
                if (c == '\'')
                {
                    string ch = ReadChar();
                    if (ch == null)
                        yield return new Token(TokenType.Error, "Caracter no válido", startLine, startCol);
                    else
                        yield return new Token(TokenType.Char, ch, startLine, startCol);
                    continue;
                }

                // Identificadores entre backticks `ident`
                if (c == '`')
                {
                    string bkid = ReadBacktickIdent();
                    if (bkid == null)
                        yield return new Token(TokenType.Error, "Identificador entre backticks mal formado", startLine, startCol);
                    else
                        yield return new Token(TokenType.BacktickIdent, bkid, startLine, startCol);
                    continue;
                }

                // Números (int, float, float con exponentes)
                if (char.IsDigit(c))
                {
                    yield return ReadNumber();
                    continue;
                }

                // Identificadores normales y keywords
                if (IsIdentStart(c))
                {
                    string id = ReadIdentifier();
                    TokenType ttype = Keywords.Contains(id) ? TokenType.Keyword : TokenType.Identifier;
                    yield return new Token(ttype, id, startLine, startCol);
                    continue;
                }

                // Operadores y delimitadores
                var opDelim = ReadOperatorOrDelimiter();
                if (opDelim != null)
                {
                    yield return new Token(opDelim.Value.type, opDelim.Value.lexeme, startLine, startCol);
                    continue;
                }

                // Cualquier otro caracter es error
                Advance();
                yield return new Token(TokenType.Error, c.ToString(), startLine, startCol);
            }

            yield return new Token(TokenType.EOF, "", line, col);
        }

        private void SkipWhitespace()
        {
            while (!IsAtEnd() && char.IsWhiteSpace(Peek()))
            {
                if (Peek() == '\n')
                {
                    line++;
                    col = 1;
                }
                else
                    col++;
                index++;
            }
        }

        private string ReadNestedComment()
        {
            int startIndex = index;
            int depth = 1; // Cambiado a 1 porque ya detectamos un '(*'

            while (!IsAtEnd())
            {
                if (Peek() == '(' && PeekNext() == '*')
                {
                    depth++;
                    Advance(); Advance();
                    continue;
                }

                if (Peek() == '*' && PeekNext() == ')')
                {
                    depth--;
                    Advance(); Advance();
                    if (depth == 0)
                    {
                        int length = index - startIndex;
                        return source.Substring(startIndex, length);
                    }
                    continue;
                }

                if (Peek() == '\n')
                {
                    line++;
                    col = 1;
                }
                else col++;

                Advance();
            }

            // No cerrado
            return null;
        }

        private string ReadString()
        {
            StringBuilder sb = new();
            Advance(); // consume la comilla inicial

            while (!IsAtEnd())
            {
                char c = Peek();

                if (c == '"')
                {
                    Advance();
                    return sb.ToString();
                }

                if (c == '\\')
                {
                    Advance();
                    if (IsAtEnd()) return null;
                    char esc = Peek();
                    sb.Append(ParseEscape(esc));
                    Advance();
                    continue;
                }

                if (c == '\n') // strings multilínea no permitidas en OCaml
                    return null;

                sb.Append(c);
                Advance();
            }

            return null; // no cerrada
        }

        private string ReadChar()
        {
            StringBuilder sb = new();
            Advance(); // consume '

            if (IsAtEnd()) return null;

            char c = Peek();

            if (c == '\\')
            {
                Advance();
                if (IsAtEnd()) return null;
                sb.Append(ParseEscape(Peek()));
                Advance();
            }
            else
            {
                sb.Append(c);
                Advance();
            }

            if (IsAtEnd()) return null;

            if (Peek() != '\'') return null;

            Advance(); // consume '

            return sb.ToString();
        }

        private string ReadBacktickIdent()
        {
            Advance(); // consume `
            StringBuilder sb = new();

            while (!IsAtEnd() && Peek() != '`')
            {
                sb.Append(Peek());
                Advance();
            }

            if (IsAtEnd()) return null;

            Advance(); // consume cierre `

            return sb.ToString();
        }

        private Token ReadNumber()
        {
            int startLine = line, startCol = col;
            int startIdx = index;

            while (!IsAtEnd() && char.IsDigit(Peek()))
                Advance();

            bool isFloat = false;

            if (!IsAtEnd() && Peek() == '.')
            {
                isFloat = true;
                Advance();

                if (!IsAtEnd() && char.IsDigit(Peek()))
                {
                    while (!IsAtEnd() && char.IsDigit(Peek()))
                        Advance();
                }
                else
                {
                    // Error: punto sin dígito después
                    string lexErr = source.Substring(startIdx, index - startIdx);
                    return new Token(TokenType.Error, lexErr, startLine, startCol);
                }
            }

            // Exponentes (e.g., 1.23e-4)
            if (!IsAtEnd() && (Peek() == 'e' || Peek() == 'E'))
            {
                isFloat = true;
                Advance();

                if (!IsAtEnd() && (Peek() == '+' || Peek() == '-'))
                    Advance();

                if (!IsAtEnd() && char.IsDigit(Peek()))
                {
                    while (!IsAtEnd() && char.IsDigit(Peek()))
                        Advance();
                }
                else
                {
                    string lexErr = source.Substring(startIdx, index - startIdx);
                    return new Token(TokenType.Error, lexErr, startLine, startCol);
                }
            }

            string lex = source.Substring(startIdx, index - startIdx);
            return new Token(isFloat ? TokenType.Float : TokenType.Int, lex, startLine, startCol);
        }

        private string ReadIdentifier()
        {
            StringBuilder sb = new();

            while (!IsAtEnd() && IsIdentPart(Peek()))
            {
                sb.Append(Peek());
                Advance();
            }

            return sb.ToString();
        }

        private (TokenType type, string lexeme)? ReadOperatorOrDelimiter()
        {
            // Operadores y delimitadores OCaml (completo y ordenado por longitud para no confundir)
            string[] ops = new string[]
            {
                "==", "->", ":=", "::", "+.", "-.", "*.", "/.", "+", "-", "*", "/", "=",
                "<>", "<", ">", "&&", "||", "@@", "|>", ":",
                ".", ";", ",", "(", ")", "[", "]", "{", "}"
            };

            foreach (string op in ops)
            {
                if (MatchString(op))
                {
                    TokenType t = (op == "(" || op == ")" || op == "[" || op == "]" || op == "{" || op == "}" || op == ";" || op == "," || op == ":")
                        ? TokenType.Delimiter : TokenType.Operator;
                    return (t, op);
                }
            }

            return null;
        }

        private char Peek() => source[index];
        private char PeekNext() => index + 1 < source.Length ? source[index + 1] : '\0';

        private void Advance()
        {
            if (IsAtEnd()) return; // Protección añadida
            if (Peek() == '\n')
            {
                line++;
                col = 1;
            }
            else
            {
                col++;
            }
            index++;
        }

        private bool MatchString(string s)
        {
            if (index + s.Length > source.Length)
                return false;

            for (int i = 0; i < s.Length; i++)
                if (source[index + i] != s[i])
                    return false;

            index += s.Length;
            col += s.Length;
            return true;
        }

        private char ParseEscape(char c)
        {
            return c switch
            {
                'n' => '\n',
                't' => '\t',
                'r' => '\r',
                '\\' => '\\',
                '"' => '"',
                '\'' => '\'',
                _ => c,
            };
        }

        private bool IsAtEnd() => index >= source.Length;

        private bool IsIdentStart(char c) =>
            char.IsLetter(c) || c == '_';

        private bool IsIdentPart(char c) =>
            char.IsLetterOrDigit(c) || c == '_' || c == '\'';
    }
}
