import { validateArtifactPaths } from './contracts';
import { isAllowedArtifactPath, MAX_ARTIFACT_FILES, MAX_ARTIFACT_SOURCE_BYTES, TRUSTED_STARTER_FILES } from './artifact';
import type { CodeFileOperations } from './contracts';
import ts from 'typescript';

const ALLOWED_IMPORTS = new Set(['react', 'react-dom', 'lucide-react', 'clsx', 'tailwind-merge']);

export function validateCodeOperations(output: CodeFileOperations, baseFileIndex?: Array<{ path: string; sha256: string }>): string[] {
  const errors: string[] = [];
  const paths = output.operations.map((operation) => operation.path);
  errors.push(...validateArtifactPaths(paths).map((path) => `Unsafe path: ${path}`));
  if (paths.length > MAX_ARTIFACT_FILES) errors.push(`Too many generated files: ${paths.length}`);
  const totalBytes = output.operations.reduce((sum, operation) => sum + Buffer.byteLength('content' in operation ? operation.content : '', 'utf8'), 0);
  if (totalBytes > MAX_ARTIFACT_SOURCE_BYTES) errors.push('Generated source exceeds 300 KB');

  const knownPaths = new Set(baseFileIndex?.map((file) => file.path));
  for (const operation of output.operations) {
    if (!isAllowedArtifactPath(operation.path)) errors.push(`Path is not allowlisted for generated source: ${operation.path}`);
    if (TRUSTED_STARTER_FILES.has(operation.path)) errors.push(`Trusted starter file cannot be modified: ${operation.path}`);
    const exists = knownPaths.has(operation.path);
    if (operation.kind === 'add' && exists) errors.push(`Cannot add existing file: ${operation.path}`);
    if ((operation.kind === 'update' || operation.kind === 'delete') && baseFileIndex && !exists) errors.push(`Cannot ${operation.kind} missing file: ${operation.path}`);
    if (operation.kind === 'add') knownPaths.add(operation.path);
    if (operation.kind === 'delete') knownPaths.delete(operation.path);
    if ('content' in operation) {
      if (/\.(?:ts|tsx)$/.test(operation.path)) {
        const diagnostics = ts.transpileModule(operation.content, {
          compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
          reportDiagnostics: true,
          fileName: operation.path,
        }).diagnostics || [];
        for (const diagnostic of diagnostics) {
          if (diagnostic.category === ts.DiagnosticCategory.Error) errors.push(`TypeScript syntax error in ${operation.path}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
        }
      }
      for (const match of operation.content.matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)) {
        const imported = match[1];
        if (imported.startsWith('.') || imported.startsWith('/')) continue;
        const packageName = imported.startsWith('@') ? imported.split('/').slice(0, 2).join('/') : imported.split('/')[0];
        if (!ALLOWED_IMPORTS.has(packageName)) errors.push(`Unsupported import in ${operation.path}: ${packageName}`);
      }
      if (/(?:\b(?:eval|new\s+Function|child_process|process\.env|document\.cookie|require)\b|\bimport\s*\(|<\/?script\b|javascript\s*:|dangerouslySetInnerHTML|document\.write|insertAdjacentHTML|\b(?:innerHTML|outerHTML)\s*=)/i.test(operation.content)) {
        errors.push(`Unsafe runtime primitive in ${operation.path}`);
      }
    }
  }
  return [...new Set(errors)];
}
