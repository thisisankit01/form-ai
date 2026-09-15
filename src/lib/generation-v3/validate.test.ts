import { describe, expect, it } from 'vitest';
import { CodeFileOperations } from './contracts';
import { validateCodeOperations } from './validate';

describe('generation v3 code validation', () => {
  it('rejects unsupported imports and host-sensitive primitives', () => {
    const output = CodeFileOperations.parse({
      schemaVersion: 3,
      operations: [{ kind: 'add', path: 'src/App.tsx', content: "import x from 'axios'; process.env.SECRET;" }],
      journeyMappings: [],
      summary: [],
    });
    expect(validateCodeOperations(output)).toEqual([
      'Unsupported import in src/App.tsx: axios',
      'Unsafe runtime primitive in src/App.tsx',
    ]);
  });

  it('allows local source imports and bounded files', () => {
    const output = CodeFileOperations.parse({
      schemaVersion: 3,
      operations: [{ kind: 'add', path: 'src/App.tsx', content: "import './styles.css'; export default function App() { return null; }" }],
      journeyMappings: [],
      summary: [],
    });
    expect(validateCodeOperations(output)).toEqual([]);
  });

  it('rejects malformed TSX before sandbox execution', () => {
    const output = CodeFileOperations.parse({
      schemaVersion: 3,
      operations: [{ kind: 'add', path: 'src/Broken.tsx', content: "export const title = 'unclosed;" }],
      journeyMappings: [],
      summary: [],
    });
    expect(validateCodeOperations(output)).toContainEqual(expect.stringContaining('TypeScript syntax error in src/Broken.tsx'));
  });

  it('rejects protected starter files and enforces add versus update', () => {
    const output = CodeFileOperations.parse({
      schemaVersion: 3,
      operations: [
        { kind: 'update', path: 'src/main.tsx', content: 'export default 1;', expectedSha256: 'a'.repeat(64) },
        { kind: 'add', path: 'src/App.tsx', content: 'export default 1;' },
        { kind: 'update', path: 'src/missing.tsx', content: 'export default 1;', expectedSha256: 'a'.repeat(64) },
      ],
      journeyMappings: [],
      summary: [],
    });
    expect(validateCodeOperations(output, [
      { path: 'src/main.tsx', sha256: 'a'.repeat(64) },
      { path: 'src/App.tsx', sha256: 'b'.repeat(64) },
    ])).toEqual([
      'Trusted starter file cannot be modified: src/main.tsx',
      'Cannot add existing file: src/App.tsx',
      'Cannot update missing file: src/missing.tsx',
    ]);
  });

  it('rejects executable injection and non-source paths', () => {
    const output = CodeFileOperations.parse({
      schemaVersion: 3,
      operations: [{ kind: 'add', path: 'public/readme.txt', content: '<script>alert(1)</script> import("x"); require("x");' }],
      journeyMappings: [],
      summary: [],
    });
    expect(validateCodeOperations(output)).toEqual([
      'Path is not allowlisted for generated source: public/readme.txt',
      'Unsafe runtime primitive in public/readme.txt',
    ]);
  });
});
