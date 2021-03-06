// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Session } from '@jupyterlab/services';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { Token } from '@lumino/coreutils';

import { Widget } from '@lumino/widgets';

import { CompletionHandler } from './handler';

import { Completer } from './widget';

/* tslint:disable */
/**
 * The completion manager token.
 */
export const ICompletionManager = new Token<ICompletionManager>(
  '@jupyterlab/completer:ICompletionManager'
);
/* tslint:enable */

/**
 * A manager to register completers with parent widgets.
 */
export interface ICompletionManager {
  /**
   * Register a completable object with the completion manager.
   *
   * @returns A completable object whose attributes can be updated as necessary.
   */
  register(provider: ICompletionProvider): void;

  getProvider(id: string): ICompletionProvider | undefined;

  overrideProvider(provider: ICompletionProvider): void;

  invoke(id: string): void;

	selectActive(id: string): void;
}

/**
 * A namespace for `ICompletionManager` interface specifications.
 */
export namespace ICompletionManager {
  /**
   * The attributes of a completable object that can change and sync at runtime.
   */
  export interface ICompletableAttributes {
    /**
     * The host editor for the completer.
     */
    editor: CodeEditor.IEditor | null;

    /**
     * The data connector used to populate the completer.
     * Use the connector with ICompletionItemsReply for enhanced completions.
     */
    connector: CompletionHandler.ICompletionItemsConnector;
  }

  /**
   * An interface for completer-compatible objects.
   */
  export interface ICompletable extends ICompletableAttributes {
    /**
     * The parent of the completer; the completer resources dispose with parent.
     */
    readonly parent: Widget;
  }
}

export interface ICompletionContext {
  completer: Completer;
  editor?: CodeEditor.IEditor;
  widget: Widget;
  session?: Session.ISessionConnection;
}

export interface ICompletionProvider {
  /**
   * Unique identifier of the provider
   */
  readonly id: string;

  /**
   * Renderer for provider's completions (optional).
   */
  readonly renderer?: Completer.IRenderer;

  /**
   * Set the completion context when this changes.
   * 
   * @param context - additional information about context of completion request
   */
  setContext(context: ICompletionContext): void;

  /**
   * Is completion provider applicable to specified context?
   * 
   * @param request - useful because we may want to disable specific sources in some parts of document (like sql code cell in a Python notebook)
   * @param context - additional information about context of completion request
   */
  isApplicable(
    request: CompletionHandler.IRequest,
    context: ICompletionContext
  ): Promise<boolean>;

  /**
   * Fetch completion requests.
   *
   * @param request - the completion request text and details
   * @param context - additional information about context of completion request
   */
  fetch(
    state: Completer.ITextState,
    request: CompletionHandler.IRequest
  ): void;

  /**
   * Given an incomplete (unresolved) completion item, resolve it by adding all missing details,
   * such as lazy-fetched documentation.
   *
   * @param completion - the completion item to resolve
   */
  resolve?(
    completion: CompletionHandler.ICompletionItem
  ): Promise<CompletionHandler.ICompletionItem>;
}