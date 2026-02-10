'use client';

import { useState, useMemo } from 'react';
import { Copy, Check, Code2, ChevronDown, ChevronUp } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: 'sql' | 'json' | 'text';
  title?: string;
  variant?: 'default' | 'danger' | 'success';
  collapsedHeight?: number;
  showLineNumbers?: boolean;
}

// Token types for syntax highlighting
type TokenType = 'keyword' | 'string' | 'number' | 'comment' | 'operator' | 'text';

interface Token {
  type: TokenType;
  value: string;
}

// SQL keywords for highlighting
const SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
  'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'ORDER', 'BY',
  'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT', 'INTO', 'VALUES',
  'UPDATE', 'SET', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'INDEX', 'TABLE',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'NULL', 'DEFAULT',
  'AUTO_INCREMENT', 'ENGINE', 'CHARSET', 'COLLATE', 'IF', 'EXISTS',
  'ADD', 'COLUMN', 'MODIFY', 'RENAME', 'TO', 'CASCADE', 'OPTIMIZE', 'ANALYZE',
  'USING', 'BTREE', 'HASH', 'ASC', 'DESC', 'DISTINCT', 'COUNT', 'SUM', 'AVG',
  'MAX', 'MIN', 'CONCAT', 'SUBSTRING', 'REPLACE', 'TRIM', 'UPPER', 'LOWER',
  'COALESCE', 'IFNULL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CAST',
  'UNION', 'ALL', 'EXCEPT', 'INTERSECT', 'WITH', 'RECURSIVE', 'EXPLAIN',
  'INT', 'VARCHAR', 'TEXT', 'DATETIME', 'TIMESTAMP', 'BOOLEAN', 'DECIMAL',
  'FLOAT', 'DOUBLE', 'BIGINT', 'SMALLINT', 'TINYINT', 'BLOB', 'JSON', 'FORMAT'
]);

// Simple tokenizer for SQL
function tokenizeSQL(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // Skip whitespace but preserve it
    if (/\s/.test(code[i])) {
      let ws = '';
      while (i < code.length && /\s/.test(code[i])) {
        ws += code[i];
        i++;
      }
      tokens.push({ type: 'text', value: ws });
      continue;
    }

    // Single-line comment
    if (code.slice(i, i + 2) === '--') {
      let comment = '';
      while (i < code.length && code[i] !== '\n') {
        comment += code[i];
        i++;
      }
      tokens.push({ type: 'comment', value: comment });
      continue;
    }

    // Multi-line comment
    if (code.slice(i, i + 2) === '/*') {
      let comment = '';
      while (i < code.length && code.slice(i, i + 2) !== '*/') {
        comment += code[i];
        i++;
      }
      if (i < code.length) {
        comment += '*/';
        i += 2;
      }
      tokens.push({ type: 'comment', value: comment });
      continue;
    }

    // String (single quotes)
    if (code[i] === "'") {
      let str = "'";
      i++;
      while (i < code.length && code[i] !== "'") {
        if (code[i] === '\\' && i + 1 < code.length) {
          str += code[i] + code[i + 1];
          i += 2;
        } else {
          str += code[i];
          i++;
        }
      }
      if (i < code.length) {
        str += "'";
        i++;
      }
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // String (double quotes)
    if (code[i] === '"') {
      let str = '"';
      i++;
      while (i < code.length && code[i] !== '"') {
        if (code[i] === '\\' && i + 1 < code.length) {
          str += code[i] + code[i + 1];
          i += 2;
        } else {
          str += code[i];
          i++;
        }
      }
      if (i < code.length) {
        str += '"';
        i++;
      }
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Backtick identifier
    if (code[i] === '`') {
      let id = '`';
      i++;
      while (i < code.length && code[i] !== '`') {
        id += code[i];
        i++;
      }
      if (i < code.length) {
        id += '`';
        i++;
      }
      tokens.push({ type: 'string', value: id });
      continue;
    }

    // Number
    if (/\d/.test(code[i])) {
      let num = '';
      while (i < code.length && /[\d.]/.test(code[i])) {
        num += code[i];
        i++;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }

    // Word (keyword or identifier)
    if (/[a-zA-Z_]/.test(code[i])) {
      let word = '';
      while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) {
        word += code[i];
        i++;
      }
      if (SQL_KEYWORDS.has(word.toUpperCase())) {
        tokens.push({ type: 'keyword', value: word });
      } else {
        tokens.push({ type: 'text', value: word });
      }
      continue;
    }

    // Operators and punctuation
    tokens.push({ type: 'operator', value: code[i] });
    i++;
  }

  return tokens;
}

// Light theme token colors
const tokenStyles: Record<TokenType, string> = {
  keyword: 'text-blue-600 font-semibold',
  string: 'text-emerald-600',
  number: 'text-purple-600',
  comment: 'text-slate-400 italic',
  operator: 'text-slate-600',
  text: 'text-slate-700'
};

export const CodeBlock = ({
  code,
  language = 'sql',
  title,
  variant = 'default',
  collapsedHeight = 80,
  showLineNumbers = false
}: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Light theme variant styles
  const variantStyles = {
    default: {
      container: 'bg-slate-50 border-slate-200',
      header: 'bg-slate-100 border-slate-200 text-slate-600',
      code: 'bg-white',
      expandBtn: 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
    },
    danger: {
      container: 'bg-red-50 border-red-200',
      header: 'bg-red-100 border-red-200 text-red-700',
      code: 'bg-white',
      expandBtn: 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
    },
    success: {
      container: 'bg-teal-50 border-teal-200',
      header: 'bg-teal-100 border-teal-200 text-teal-700',
      code: 'bg-white',
      expandBtn: 'bg-teal-50 text-teal-600 hover:bg-teal-100 border-teal-200'
    }
  };

  const styles = variantStyles[variant];

  // Tokenize SQL code
  const tokens = useMemo(() => {
    if (language === 'sql') {
      return tokenizeSQL(code);
    }
    return [{ type: 'text' as TokenType, value: code }];
  }, [code, language]);

  // Check if code needs expand button (always show if more than 1 line or longer content)
  const lines = code.split('\n');
  const needsExpand = lines.length > 1 || code.length > 80;

  return (
    <div className={`rounded-lg border overflow-hidden ${styles.container}`}>
      {/* Header with title and copy button */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${styles.header}`}>
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4" />
          <span className="text-xs font-medium uppercase tracking-wider">
            {title || language.toUpperCase()}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-black/5"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div
        className={`overflow-hidden transition-all duration-200 ${styles.code}`}
        style={{
          maxHeight: expanded ? 'none' : `${collapsedHeight}px`
        }}
      >
        <pre className="p-3 text-sm font-mono leading-relaxed overflow-x-auto">
          {showLineNumbers ? (
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td
                      className="select-none text-right pr-4 border-r border-slate-200 text-slate-400"
                      style={{ width: '3rem' }}
                    >
                      {idx + 1}
                    </td>
                    <td className="pl-4 whitespace-pre">
                      {language === 'sql' ? (
                        tokenizeSQL(line).map((token, tidx) => (
                          <span key={tidx} className={tokenStyles[token.type]}>
                            {token.value}
                          </span>
                        ))
                      ) : (
                        line || '\u00A0'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <code className="whitespace-pre-wrap break-words">
              {language === 'sql' ? (
                tokens.map((token, idx) => (
                  <span key={idx} className={tokenStyles[token.type]}>
                    {token.value}
                  </span>
                ))
              ) : (
                code
              )}
            </code>
          )}
        </pre>
      </div>

      {/* Expand/Collapse button */}
      {needsExpand && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className={`w-full flex items-center justify-center gap-1 py-1.5 text-xs font-medium border-t transition-colors ${styles.expandBtn}`}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Collapse</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>Show Full Code ({lines.length} lines)</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default CodeBlock;
