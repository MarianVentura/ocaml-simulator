export function analyzeLexically(code) {
  const keywords = ["let", "in", "fun", "match", "with", "if", "then", "else", "rec"];
  const tokens = [];

  const lines = code.split('\n');

  lines.forEach((line, lineIndex) => {
    let match;
    const regex = /\b\w+\b|[=->:;(){}\[\]]/g;
    
    while ((match = regex.exec(line)) !== null) {
      const word = match[0];
      const column = match.index + 1;

      let type;
      if (keywords.includes(word)) {
        type = "Keyword";
      } else if (!isNaN(word)) {
        type = "Number";
      } else if (/^[a-zA-Z_]\w*$/.test(word)) {
        type = "Identifier";
      } else {
        type = "Symbol";
      }

      tokens.push({
        type,
        value: word,
        line: lineIndex + 1,
        column
      });
    }
  });

  return tokens;
}
