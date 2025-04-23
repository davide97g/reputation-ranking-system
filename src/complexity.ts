import Parser, { SyntaxNode, Tree } from "tree-sitter";
import CSS from "tree-sitter-css";
import JavaScript from "tree-sitter-javascript";
import TypeScript from "tree-sitter-typescript";

export type ILanguage = "js" | "ts" | "tsx" | "css";

function getParserForLang(lang: ILanguage): Parser | null {
  const parser = new Parser();
  switch (lang) {
    case "js":
      parser.setLanguage(JavaScript as any);
      break;
    case "ts":
      parser.setLanguage(TypeScript.typescript as any);
      break;
    case "tsx":
      parser.setLanguage(TypeScript.tsx as any);
      break;
    case "css":
      parser.setLanguage(CSS as any);
      break;
    default:
      return null;
  }
  return parser;
}

function countNodes(node: SyntaxNode, types: string[]): number {
  let count = 0;
  if (types.includes(node.type)) count++;
  for (const child of node.namedChildren) {
    count += countNodes(child, types);
  }
  return count;
}

function computeStructuralComplexity(patch: string, lang: ILanguage): number {
  const addedCode = patch
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1))
    .join("\n");

  if (!addedCode.trim()) return 0.0;

  const parser = getParserForLang(lang);
  if (!parser) return 0.0;

  let tree: Tree;
  try {
    tree = parser.parse(addedCode);
  } catch (err) {
    console.error("Parse error:", err);
    return 0.0;
  }

  const root = tree.rootNode;
  let score = 0;

  if (["js", "ts", "tsx"].includes(lang)) {
    const functions = countNodes(root, [
      "function",
      "function_declaration",
      "method_definition",
      "arrow_function",
    ]);
    const classes = countNodes(root, ["class_declaration"]);
    const loops = countNodes(root, ["for_statement", "while_statement"]);
    const conditions = countNodes(root, ["if_statement", "switch_statement"]);
    const tryBlocks = countNodes(root, ["try_statement"]);

    score =
      functions * 1.5 +
      classes * 2 +
      (loops + conditions) * 1.2 +
      tryBlocks * 1.5;
  } else if (lang === "css") {
    const rules = countNodes(root, ["rule_set"]);
    const selectors = countNodes(root, [
      "class_selector",
      "id_selector",
      "type_selector",
    ]);
    score = rules * 1 + selectors * 0.5;
  }

  return parseFloat(score.toFixed(2));
}

export { computeStructuralComplexity };
