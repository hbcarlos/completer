// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module completer-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ICompletionManager,
  CompletionManager,
  DefaultProvider
} from './completer';

import { IConsoleTracker } from '@jupyterlab/console';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker } from '@jupyterlab/notebook';

/**
 * The command IDs used by the completer plugin.
 */
namespace CommandIDs {
  export const invoke = 'completer:invoke';

  export const invokeConsole = 'completer:invoke-console';

  export const invokeNotebook = 'completer:invoke-notebook';

  export const invokeFile = 'completer:invoke-file';

  export const select = 'completer:select';

  export const selectConsole = 'completer:select-console';

  export const selectNotebook = 'completer:select-notebook';

  export const selectFile = 'completer:select-file';
}

/**
 * A plugin providing code completion for editors.
 */
const manager: JupyterFrontEndPlugin<ICompletionManager> = {
  id: '@quantstack/completer-extension:manager',
  autoStart: true,
  requires: [IConsoleTracker, IEditorTracker, INotebookTracker],
  provides: ICompletionManager,
  activate: (app: JupyterFrontEnd, consoles: IConsoleTracker, editors: IEditorTracker, notebooks: INotebookTracker): ICompletionManager => {
    const manager = new CompletionManager({
      app,
      consoles,
      editors,
      notebooks
    });

    app.commands.addCommand(CommandIDs.invoke, {
      execute: args => {
        const id = args && (args['id'] as string);
        if (!id) {
          return;
        }
        manager.invoke(id);
      }
    });

    app.commands.addCommand(CommandIDs.select, {
      execute: args => {
        const id = args && (args['id'] as string);
        if (!id) {
          return;
        }

        manager.selectActive(id);
      }
    });

    return manager;
  }
};

/**
 * An extension that registers consoles for code completion.
 */
const consoles: JupyterFrontEndPlugin<void> = {
  id: '@quantstack/completer-extension:consoles',
  requires: [ICompletionManager, IConsoleTracker],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    manager: ICompletionManager,
    consoles: IConsoleTracker
  ): void => {
    // Add console completer invoke command.
    app.commands.addCommand(CommandIDs.invokeConsole, {
      execute: () => {
        const id = consoles.currentWidget && consoles.currentWidget.id;

        if (id) {
          return app.commands.execute(CommandIDs.invoke, { id });
        }
      }
    });

    // Add console completer select command.
    app.commands.addCommand(CommandIDs.selectConsole, {
      execute: () => {
        const id = consoles.currentWidget && consoles.currentWidget.id;

        if (id) {
          return app.commands.execute(CommandIDs.select, { id });
        }
      }
    });

    // Set enter key for console completer select command.
    app.commands.addKeyBinding({
      command: CommandIDs.selectConsole,
      keys: ['Enter'],
      selector: `.jp-ConsolePanel .jp-mod-completer-active`
    });

    manager.register(new DefaultProvider());
  }
};

/**
 * An extension that registers notebooks for code completion.
 */
const notebooks: JupyterFrontEndPlugin<void> = {
  id: '@quantstack/completer-extension:notebooks',
  requires: [ICompletionManager, INotebookTracker],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    manager: ICompletionManager,
    notebooks: INotebookTracker
  ): void => {

    // Add notebook completer command.
    app.commands.addCommand(CommandIDs.invokeNotebook, {
      execute: () => {
        const panel = notebooks.currentWidget;
        if (panel && panel.content.activeCell?.model.type === 'code') {
          return app.commands.execute(CommandIDs.invoke, { id: panel.id });
        }
      }
    });

    // Add notebook completer select command.
    app.commands.addCommand(CommandIDs.selectNotebook, {
      execute: () => {
        const id = notebooks.currentWidget && notebooks.currentWidget.id;

        if (id) {
          return app.commands.execute(CommandIDs.select, { id });
        }
      }
    });

    // Set enter key for notebook completer select command.
    app.commands.addKeyBinding({
      command: CommandIDs.selectNotebook,
      keys: ['Enter'],
      selector: `.jp-Notebook .jp-mod-completer-active`
    });
  }
};

/**
 * An extension that registers file editors for completion.
 */
const files: JupyterFrontEndPlugin<void> = {
  id: '@quantstack/completer-extension:files',
  requires: [ICompletionManager, IEditorTracker],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    manager: ICompletionManager,
    editorTracker: IEditorTracker
  ): void => {
    
    // Add console completer invoke command.
    app.commands.addCommand(CommandIDs.invokeFile, {
      execute: () => {
        const id =
          editorTracker.currentWidget && editorTracker.currentWidget.id;

        if (id) {
          return app.commands.execute(CommandIDs.invoke, { id });
        }
      }
    });

    // Add console completer select command.
    app.commands.addCommand(CommandIDs.selectFile, {
      execute: () => {
        const id =
          editorTracker.currentWidget && editorTracker.currentWidget.id;

        if (id) {
          return app.commands.execute(CommandIDs.select, { id });
        }
      }
    });

    // Set enter key for console completer select command.
    app.commands.addKeyBinding({
      command: CommandIDs.selectFile,
      keys: ['Enter'],
      selector: `.jp-FileEditor .jp-mod-completer-active`
    });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  manager,
  consoles,
  notebooks,
  files
];
export default plugins;
