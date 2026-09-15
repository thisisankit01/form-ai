import { describe, expect, it } from 'vitest';
import { applyArtifactOperations, sha256 } from './artifact';

describe('generation v3 artifact operations', () => {
  it('requires the expected file hash before applying an edit', () => {
    const original = 'const answer = 1;';
    expect(applyArtifactOperations(
      [{ path: 'src/App.tsx', content: original }],
      [{ kind: 'update', path: 'src/App.tsx', content: 'const answer = 2;', expectedSha256: sha256(original) }],
    )).toEqual([{ path: 'src/App.tsx', content: 'const answer = 2;' }]);
    expect(() => applyArtifactOperations(
      [{ path: 'src/App.tsx', content: original }],
      [{ kind: 'update', path: 'src/App.tsx', content: 'stale', expectedSha256: sha256('other') }],
    )).toThrow('Stale artifact file');
  });

  it('does not allow add to replace a file or update to create one', () => {
    expect(() => applyArtifactOperations(
      [{ path: 'src/App.tsx', content: 'original' }],
      [{ kind: 'add', path: 'src/App.tsx', content: 'replacement' }],
    )).toThrow('already exists');
    expect(() => applyArtifactOperations(
      [],
      [{ kind: 'update', path: 'src/App.tsx', content: 'new', expectedSha256: sha256('new') }],
    )).toThrow('does not exist');
  });

  it('does not modify trusted starter files', () => {
    expect(() => applyArtifactOperations(
      [{ path: 'src/main.tsx', content: 'starter' }],
      [{ kind: 'update', path: 'src/main.tsx', content: 'changed', expectedSha256: sha256('starter') }],
    )).toThrow('Trusted starter file');
  });
});
