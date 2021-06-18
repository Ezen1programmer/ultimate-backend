import { Tree } from '@angular-devkit/schematics';
import { NxJson, readJsonInTree } from '@nrwl/workspace';
import { createEmptyWorkspace, getFileContent } from '@nrwl/workspace/testing';
import { runSchematic } from '../../utils/testing';
import { stripIndents } from '@angular-devkit/core/src/utils/literals';

describe('lib', () => {
  let appTree: Tree;

  beforeEach(() => {
    appTree = Tree.empty();
    appTree = createEmptyWorkspace(appTree);
  });

  describe('not nested', () => {
    it('should update workspace.json', async () => {
      const tree = await runSchematic('lib', { name: 'myLib' }, appTree);
      const workspaceJson = readJsonInTree(tree, '/workspace.json');
      expect(workspaceJson.projects['my-lib'].root).toEqual('packages/my-lib');
      expect(workspaceJson.projects['my-lib'].architect.build).toBeUndefined();
      expect(workspaceJson.projects['my-lib'].architect.lint).toEqual({
        builder: '@nrwl/linter:eslint',
        options: {
          lintFilePatterns: ['packages/my-lib/**/*.ts'],
        },
      });
      expect(workspaceJson.projects['my-lib'].architect.test).toEqual({
        builder: '@nrwl/jest:jest',
        outputs: ['coverage/packages/my-lib'],
        options: {
          jestConfig: 'packages/my-lib/jest.config.js',
          passWithNoTests: true,
        },
      });
    });

    it('should include a controller', async () => {
      const tree = await runSchematic(
        'lib',
        { name: 'myLib', controller: true },
        appTree
      );
      const service = getFileContent(
        tree,
        'packages/my-lib/src/lib/my-lib.controller.ts'
      );
      expect(service).toBeTruthy();
    });

    it('should include a service', async () => {
      const tree = await runSchematic(
        'lib',
        { name: 'myLib', service: true },
        appTree
      );
      const service = getFileContent(
        tree,
        'packages/my-lib/src/lib/my-lib.service.ts'
      );
      expect(service).toBeTruthy();
    });

    it('should add the @Global decorator', async () => {
      const tree = await runSchematic(
        'lib',
        { name: 'myLib', global: true },
        appTree
      );
      const module = getFileContent(
        tree,
        'packages/my-lib/src/lib/my-lib.module.ts'
      );
      expect(stripIndents`${module}`).toEqual(
        stripIndents`import { Module, Global } from '@nestjs/common';

          @Global()
          @Module({
          controllers: [],
          providers: [],
          exports: [],
          })
          export class MyLibModule {}`
      );
    });

    it('should remove the default file from @nrwl/node:lib', async () => {
      const tree = await runSchematic(
        'lib',
        { name: 'myLib', global: true },
        appTree
      );
      expect(tree.exists('packages/my-lib/src/lib/my-lib.spec.ts')).toBeFalsy();
      expect(tree.exists('packages/my-lib/src/lib/my-lib.ts')).toBeFalsy();
    });

    it('should provide the controller and service', async () => {
      const tree = await runSchematic(
        'lib',
        { name: 'myLib', service: true, controller: true },
        appTree
      );
      const module = getFileContent(
        tree,
        'packages/my-lib/src/lib/my-lib.module.ts'
      );
      expect(stripIndents`${module}`).toEqual(
        stripIndents`import { Module } from '@nestjs/common';
          import { MyLibService } from './my-lib.service';
          import { MyLibController } from './my-lib.controller';

          @Module({
          controllers: [MyLibController],
          providers: [MyLibService],
          exports: [MyLibService],
          })
          export class MyLibModule {}`
      );

      const controller = getFileContent(
        tree,
        'packages/my-lib/src/lib/my-lib.controller.ts'
      );
      expect(stripIndents`${controller}`).toEqual(
        stripIndents`import { Controller } from '@nestjs/common';
          import { MyLibService } from './my-lib.service';

          @Controller('my-lib')
          export class MyLibController {
            constructor(private myLibService: MyLibService) {}
          }`
      );

      const barrel = getFileContent(tree, 'packages/my-lib/src/index.ts');
      expect(stripIndents`${barrel}`).toEqual(
        stripIndents`export * from './lib/my-lib.module';
          export * from './lib/my-lib.service';
          export * from './lib/my-lib.controller';`
      );
    });

    it('should update nx.json', async () => {
      const tree = await runSchematic(
        'lib',
        { name: 'myLib', tags: 'one,two' },
        appTree
      );
      const nxJson = readJsonInTree<NxJson>(tree, '/nx.json');
      expect(nxJson.projects).toEqual({
        'my-lib': {
          tags: ['one', 'two'],
        },
      });
    });

    it('should update root tsconfig.json', async () => {
      const tree = await runSchematic('lib', { name: 'myLib' }, appTree);
      const tsconfigJson = readJsonInTree(tree, '/tsconfig.base.json');
      expect(tsconfigJson.compilerOptions.paths['@proj/my-lib']).toEqual([
        'packages/my-lib/src/index.ts',
      ]);
    });

    it('should create a local tsconfig.json', async () => {
      const tree = await runSchematic('lib', { name: 'myLib' }, appTree);
      const tsconfigJson = readJsonInTree(tree, 'packages/my-lib/tsconfig.json');
      expect(tsconfigJson).toMatchInlineSnapshot(`
        Object {
          "extends": "../../tsconfig.base.json",
          "files": Array [],
          "include": Array [],
          "references": Array [
            Object {
              "path": "./tsconfig.lib.json",
            },
            Object {
              "path": "./tsconfig.spec.json",
            },
          ],
        }
      `);
    });

    it('should extend the local tsconfig.json with tsconfig.spec.json', async () => {
      const tree = await runSchematic('lib', { name: 'myLib' }, appTree);
      const tsconfigJson = readJsonInTree(
        tree,
        'packages/my-lib/tsconfig.spec.json'
      );
      expect(tsconfigJson.extends).toEqual('./tsconfig.json');
    });

    it('should extend the local tsconfig.json with tsconfig.lib.json', async () => {
      const tree = await runSchematic('lib', { name: 'myLib' }, appTree);
      const tsconfigJson = readJsonInTree(
        tree,
        'packages/my-lib/tsconfig.lib.json'
      );
      expect(tsconfigJson.extends).toEqual('./tsconfig.json');
    });

    it('should generate files', async () => {
      const tree = await runSchematic('lib', { name: 'myLib' }, appTree);
      expect(tree.exists(`libs/my-lib/jest.config.js`)).toBeTruthy();
      expect(tree.exists('packages/my-lib/src/index.ts')).toBeTruthy();
      expect(tree.exists(`libs/my-lib/src/lib/my-lib.spec.ts`)).toBeFalsy();

      const eslintrcJson = readJsonInTree(tree, 'packages/my-lib/.eslintrc.json');
      expect(eslintrcJson).toMatchInlineSnapshot(`
        Object {
          "extends": Array [
            "../../.eslintrc.json",
          ],
          "ignorePatterns": Array [
            "!**/*",
          ],
          "overrides": Array [
            Object {
              "files": Array [
                "*.ts",
                "*.tsx",
                "*.js",
                "*.jsx",
              ],
              "parserOptions": Object {
                "project": Array [
                  "libs/my-lib/tsconfig.*?.json",
                ],
              },
              "rules": Object {},
            },
            Object {
              "files": Array [
                "*.ts",
                "*.tsx",
              ],
              "rules": Object {},
            },
            Object {
              "files": Array [
                "*.js",
                "*.jsx",
              ],
              "rules": Object {},
            },
          ],
        }
      `);
    });
  });

  describe('nested', () => {
    it('should update nx.json', async () => {
      const tree = await runSchematic(
        'lib',
        {
          name: 'myLib',
          directory: 'myDir',
          tags: 'one',
        },
        appTree
      );
      const nxJson = readJsonInTree<NxJson>(tree, '/nx.json');
      expect(nxJson.projects).toEqual({
        'my-dir-my-lib': {
          tags: ['one'],
        },
      });

      const tree2 = await runSchematic(
        'lib',
        {
          name: 'myLib2',
          directory: 'myDir',
          tags: 'one,two',
        },
        tree
      );
      const nxJson2 = readJsonInTree<NxJson>(tree2, '/nx.json');
      expect(nxJson2.projects).toEqual({
        'my-dir-my-lib': {
          tags: ['one'],
        },
        'my-dir-my-lib2': {
          tags: ['one', 'two'],
        },
      });
    });

    it('should generate files', async () => {
      const tree = await runSchematic(
        'lib',
        { name: 'myLib', directory: 'myDir' },
        appTree
      );
      expect(tree.exists(`libs/my-dir/my-lib/jest.config.js`)).toBeTruthy();
      expect(tree.exists('packages/my-dir/my-lib/src/index.ts')).toBeTruthy();
      expect(
        tree.exists(`libs/my-dir/my-lib/src/lib/my-lib.spec.ts`)
      ).toBeFalsy();
    });

    it('should update workspace.json', async () => {
      const tree = await runSchematic(
        'lib',
        { name: 'myLib', directory: 'myDir' },
        appTree
      );
      const workspaceJson = readJsonInTree(tree, '/workspace.json');

      expect(workspaceJson.projects['my-dir-my-lib'].root).toEqual(
        'packages/my-dir/my-lib'
      );
      expect(workspaceJson.projects['my-dir-my-lib'].architect.lint).toEqual({
        builder: '@nrwl/linter:eslint',
        options: {
          lintFilePatterns: ['packages/my-dir/my-lib/**/*.ts'],
        },
      });
    });

    it('should update tsconfig.json', async () => {
      const tree = await runSchematic(
        'lib',
        { name: 'myLib', directory: 'myDir' },
        appTree
      );
      const tsconfigJson = readJsonInTree(tree, '/tsconfig.base.json');
      expect(
        tsconfigJson.compilerOptions.paths['@proj/my-dir/my-lib']
      ).toEqual(['packages/my-dir/my-lib/src/index.ts']);
      expect(
        tsconfigJson.compilerOptions.paths['my-dir-my-lib/*']
      ).toBeUndefined();
    });

    it('should create a local tsconfig.json', async () => {
      const tree = await runSchematic(
        'lib',
        { name: 'myLib', directory: 'myDir' },
        appTree
      );

      const tsconfigJson = readJsonInTree(
        tree,
        'packages/my-dir/my-lib/tsconfig.json'
      );
      expect(tsconfigJson).toMatchInlineSnapshot(`
        Object {
          "extends": "../../../tsconfig.base.json",
          "files": Array [],
          "include": Array [],
          "references": Array [
            Object {
              "path": "./tsconfig.lib.json",
            },
            Object {
              "path": "./tsconfig.spec.json",
            },
          ],
        }
      `);
    });
  });

  describe('--strict', () => {
    it('should update the projects tsconfig with strict true', async () => {
      const tree = await runSchematic(
        'lib',
        {
          name: 'myLib',
          strict: true,
        },
        appTree
      );
      const tsconfigJson = readJsonInTree(
        tree,
        '/packages/my-lib/tsconfig.lib.json'
      );

      expect(tsconfigJson.compilerOptions.strict).toBeTruthy();
      expect(
        tsconfigJson.compilerOptions.forceConsistentCasingInFileNames
      ).toBeTruthy();
      expect(tsconfigJson.compilerOptions.noImplicitReturns).toBeTruthy();
      expect(
        tsconfigJson.compilerOptions.noFallthroughCasesInSwitch
      ).toBeTruthy();
    });

    it('should default to strict false', async () => {
      const tree = await runSchematic(
        'lib',
        {
          name: 'myLib',
        },
        appTree
      );
      const tsconfigJson = readJsonInTree(
        tree,
        '/packages/my-lib/tsconfig.lib.json'
      );

      expect(tsconfigJson.compilerOptions.strict).not.toBeDefined();
      expect(
        tsconfigJson.compilerOptions.forceConsistentCasingInFileNames
      ).not.toBeDefined();
      expect(tsconfigJson.compilerOptions.noImplicitReturns).not.toBeDefined();
      expect(
        tsconfigJson.compilerOptions.noFallthroughCasesInSwitch
      ).not.toBeDefined();
    });
  });

  describe('--unit-test-runner none', () => {
    it('should not generate test configuration', async () => {
      const resultTree = await runSchematic(
        'lib',
        { name: 'myLib', unitTestRunner: 'none' },
        appTree
      );
      expect(resultTree.exists('packages/my-lib/tsconfig.spec.json')).toBeFalsy();
      expect(resultTree.exists('packages/my-lib/jest.config.js')).toBeFalsy();
      expect(resultTree.exists('packages/my-lib/lib/my-lib.spec.ts')).toBeFalsy();
      const workspaceJson = readJsonInTree(resultTree, 'workspace.json');
      expect(workspaceJson.projects['my-lib'].architect.test).toBeUndefined();
      const tsconfigJson = readJsonInTree(
        resultTree,
        'packages/my-lib/tsconfig.json'
      );
      expect(tsconfigJson).toMatchInlineSnapshot(`
        Object {
          "extends": "../../tsconfig.base.json",
          "files": Array [],
          "include": Array [],
          "references": Array [
            Object {
              "path": "./tsconfig.lib.json",
            },
          ],
        }
      `);
      expect(workspaceJson.projects['my-lib'].architect.lint)
        .toMatchInlineSnapshot(`
        Object {
          "builder": "@nrwl/linter:eslint",
          "options": Object {
            "lintFilePatterns": Array [
              "libs/my-lib/**/*.ts",
            ],
          },
        }
      `);
    });
  });

  describe('publishable package', () => {
    it('should update package.json', async () => {
      const publishableTree = await runSchematic(
        'lib',
        { name: 'mylib', publishable: true, importPath: '@proj/mylib' },
        appTree
      );

      const packageJsonContent = readJsonInTree(
        publishableTree,
        'packages/mylib/package.json'
      );

      expect(packageJsonContent.name).toEqual('@proj/mylib');
    });
  });

  describe('compiler options target', () => {
    it('should set target to es6 in tsconfig.lib.json by default', async () => {
      const tree = await runSchematic(
        'lib',
        { name: 'myLib', directory: 'myDir' },
        appTree
      );

      const tsconfigJson = readJsonInTree(
        tree,
        'packages/my-dir/my-lib/tsconfig.lib.json'
      );
      expect(tsconfigJson.compilerOptions.target).toEqual('es6');
    });

    it('should set target to es2020 in tsconfig.lib.json', async () => {
      const tree = await runSchematic(
        'lib',
        { name: 'myLib', directory: 'myDir', target: 'es2020' },
        appTree
      );

      const tsconfigJson = readJsonInTree(
        tree,
        'packages/my-dir/my-lib/tsconfig.lib.json'
      );
      expect(tsconfigJson.compilerOptions.target).toEqual('es2020');
    });

    it('should set target jest testEnvironment to node', async () => {
      const tree = await runSchematic('lib', { name: 'myLib' }, appTree);

      const jestConfig = getFileContent(tree, 'packages/my-lib/jest.config.js');
      expect(stripIndents`${jestConfig}`)
        .toEqual(stripIndents`module.exports = {
      displayName: 'my-lib',
      preset: '../../jest.preset.js',
      globals: {
        'ts-jest': {
          tsConfig: '<rootDir>/tsconfig.spec.json',
        },
      },
      testEnvironment: 'node',
      transform: {
        '^.+\\.[tj]sx?$': 'ts-jest',
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      coverageDirectory: '../../coverage/packages/my-lib',
      };`);
    });
  });
});