// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { KernelConnector } from './kernelconnector';

import { ContextConnector } from './contextconnector';

import { CompletionHandler } from './handler';

import { Completer } from './widget';

import { ICompletionProvider, ICompletionContext } from './tokens';

/**
 * A context+kernel connector for completion handlers.
 */
export class DefaultProvider implements ICompletionProvider {
  /**
   * Create a new connector for completion requests.
   */
  constructor() {}

  /**
   * Unique identifier of the provider
   */
  readonly id: string = '@quantstack/completer:DefaultProvider';

  /**
   * Renderer for provider's completions (optional).
   */
  readonly renderer?: Completer.IRenderer = Completer.defaultRenderer

  /**
   * Set the completion context when this changes.
   * 
   * @param context - additional information about context of completion request
   */
  setContext(context: ICompletionContext): void {
    this._completer = context.completer;
    this._context = new ContextConnector({ editor: context.editor ?? null });
    if (context.session) {
      this._kernel = new KernelConnector({
        session: context.session
      });
    }
  }

  /**
   * Fetch completion requests.
   *
   * @param request - the completion request text and details
   * @param context - additional information about context of completion request
   */
  fetch(
    state: Completer.ITextState,
    request: CompletionHandler.IRequest
  ): void {
    // TODO: Merge replies?
    this._kernel?.fetch(request).then( reply => {
      this._completer?.addItems(state, reply);
    });

    this._context?.fetch(request).then( reply => {
      this._completer?.addItems(state, reply);
    });
  }

  /**
   * Is completion provider applicable to specified context?
   * 
   * @param request - useful because we may want to disable specific sources in some parts of document (like sql code cell in a Python notebook)
   * @param context
   */
  isApplicable(
    request: CompletionHandler.IRequest,
    context: ICompletionContext
  ): Promise<boolean> {
    if (this._kernel && this._context) {
      return Promise.resolve(true);
    } else {
      return Promise.resolve(false);
    }
  }

  /**
   * Given an incomplete (unresolved) completion item, resolve it by adding all missing details,
   * such as lazy-fetched documentation.
   *
   * @param completion - the completion item to resolve
   */
  resolve?(completion: CompletionHandler.ICompletionItem): Promise<CompletionHandler.ICompletionItem> {
    return Promise.resolve(completion);
  }

  private _kernel: KernelConnector | null;
  private _context: ContextConnector | null;
  private _completer: Completer | null;
}

/**
 * A namespace for private functionality.
 */
export namespace Private {
  /**
   * Merge results from kernel and context completions.
   *
   * @param kernel - The kernel reply being merged.
   *
   * @param context - The context reply being merged.
   *
   * @returns A reply with a superset of kernel and context matches.
   *
   * #### Notes
   * The kernel and context matches are merged with a preference for kernel
   * results. Both lists are known to contain unique, non-repeating items;
   * so this function returns a non-repeating superset by filtering out
   * duplicates from the context list that appear in the kernel list.
   */
  export function mergeReplies(
    kernel: CompletionHandler.ICompletionItemsReply,
    context: CompletionHandler.ICompletionItemsReply
  ): CompletionHandler.ICompletionItemsReply {
    // If one is empty, return the other.
    if (kernel.items.length === 0) {
      return context;
    } else if (context.items.length === 0) {
      return kernel;
    }

    // Populate the result with a copy of the kernel matches.
    const items = kernel.items.slice();

    // Cache all the kernel matches in a memo.
    const memo = items.reduce((acc, val) => {
      acc[val.label] = null;
      return acc;
    }, {} as { [key: string]: string | null });

    // Add each context match that is not in the memo to the result.
    context.items.forEach(item => {
      if (!(item.label in memo)) {
        items.push(item);
      }
    });
    return { ...kernel, items };
  }
}
