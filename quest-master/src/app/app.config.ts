import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideMonacoEditor } from 'ngx-monaco-editor-v2';

function registerObjectScript(): void {
  const monaco = (window as any).monaco;
  if (!monaco) return;

  monaco.languages.register({ id: 'objectscript' });

  monaco.languages.setMonarchTokensProvider('objectscript', {
    keywords: [
      'SET', 'WRITE', 'IF', 'ELSE', 'ELSEIF', 'FOR', 'WHILE', 'DO', 'QUIT', 'RETURN',
      'NEW', 'KILL', 'HANG', 'OPEN', 'CLOSE', 'USE', 'READ', 'TRY', 'CATCH',
      'THROW', 'LOCK', 'MERGE', 'XECUTE', 'GOTO', 'JOB', 'HALT', 'BREAK',
      'set', 'write', 'if', 'else', 'elseif', 'for', 'while', 'do', 'quit', 'return',
      'new', 'kill', 'hang', 'open', 'close', 'use', 'read', 'try', 'catch',
      'throw', 'lock', 'merge', 'xecute', 'goto', 'job', 'halt', 'break',
      's', 'w', 'i', 'e', 'f', 'd', 'q', 'n', 'k', 'h',
    ],
    tokenizer: {
      root: [
        [/\/\/.*$/, 'comment'],
        [/;.*$/, 'comment'],
        [/#;.*$/, 'comment'],
        [/\^[%A-Za-z][A-Za-z0-9.]*/, 'variable.predefined'],
        [/\$\$[%A-Za-z][A-Za-z0-9]*/, 'identifier'],
        [/\$[A-Za-z]+/, 'type.identifier'],
        [/"[^"]*"/, 'string'],
        [/\b\d+\.?\d*\b/, 'number'],
        [
          /[A-Za-z][A-Za-z0-9]*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier',
            },
          },
        ],
        [
          /\b(Class|Property|Method|Parameter|ClassMethod|Relationship|Index|Trigger|Query|Storage)\b/,
          'keyword',
        ],
        [/##class/i, 'keyword'],
        [/[{}()\[\]]/, 'delimiter.bracket'],
        [/[;,.]/, 'delimiter'],
      ],
    },
  });

  monaco.editor.defineTheme('objectscript-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'variable.predefined', foreground: 'e06c75' },
      { token: 'type.identifier', foreground: '61afef' },
      { token: 'identifier', foreground: 'abb2bf' },
      { token: 'keyword', foreground: 'c678dd', fontStyle: 'bold' },
      { token: 'string', foreground: '98c379' },
      { token: 'number', foreground: 'd19a66' },
      { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
    ],
    colors: {},
  });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideMonacoEditor({
      baseUrl: 'assets',
      onMonacoLoad: registerObjectScript,
    }),
  ],
};
