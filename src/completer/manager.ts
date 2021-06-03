import { JupyterFrontEnd } from '@jupyterlab/application';

import { IConsoleTracker, ConsolePanel } from '@jupyterlab/console';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { Session } from '@jupyterlab/services';

import { find, toArray } from '@lumino/algorithm';

import { Widget } from '@lumino/widgets';

import { CompletionHandler } from './handler';

import { Completer } from './widget';

import { CompleterModel } from './model';

import { ICompletionManager, ICompletionProvider, ICompletionContext } from './tokens';


export class CompletionManager implements ICompletionManager {
  
  constructor(options: CompletionManager.IOptions) {
    this._providers = new Map<string, ICompletionProvider>();
    this._renderer = Completer.defaultRenderer;

		this._app = options.app;
		this._consoles = options.consoles;
		this._editors = options.editors;
		this._notebooks = options.notebooks;

		// Create a handler for each console that is created.
		this._consoles.widgetAdded.connect( this._registerConsole );

		// When a new file editor is created, make the completer for it.
		this._editors.widgetAdded.connect( this._registerEditor );
		
			// Create a handler for each notebook that is created.
    this._notebooks.widgetAdded.connect( this._registerNotebook );
		
  }

  register(provider: ICompletionProvider): void {
    if (this._providers.has(provider.id)) {
      console.warn(provider.id, 'already registered');
    }
    this._providers.set(provider.id, provider);
  }

  getProvider(id: string): ICompletionProvider | undefined {
    return this._providers.get(id);
  }

  overrideProvider(provider: ICompletionProvider): void {
    this.register(provider);
  }

  invoke(id: string) {
    // TODO: ideally this would not re-trigger if list of items not isIncomplete
    this._handlers[id].invoke();
  }

	selectActive(id: string) {
    // TODO: ideally this would not re-trigger if list of items not isIncomplete
    this._handlers[id].completer.selectActive();
  }

	private _updateProviders(context: ICompletionContext): void {
		this._providers.forEach( provider => {
			provider.setContext(context);
		});
	}

  private _registerNotebook = (sender: INotebookTracker, panel: NotebookPanel): void => {
		const editor = panel.content.activeCell?.editor;
		const session = panel.sessionContext.session ?? undefined;

		// TODO: CompletionConnector assumes editor and session are not null
		const model = new CompleterModel();
		const completer = new Completer({ editor, model, renderer: this._renderer });
		this._updateProviders({ completer, editor, widget: panel, session });
		const providers = Array.from(this._providers.values());
		const handler = new CompletionHandler({ completer, providers });

		// Hide the widget when it first loads.
		completer.hide();

		// Associate the handler with the parent widget.
		this._handlers[panel.id] = handler;

		// Set the handler's editor.
		handler.editor = editor ?? null;

		// Attach the completer widget.
		Widget.attach(completer, document.body);

		// Listen for parent disposal.
		panel.disposed.connect(() => {
			delete this._handlers[panel.id];
			completer.dispose();
			handler.dispose();
		});

		const updateConnector = () => {
			const editor = panel.content.activeCell?.editor;
			const session = panel.sessionContext.session ?? undefined;

			handler.editor = editor ?? null;
			// TODO: CompletionConnector assumes editor and session are not null
			this._updateProviders({ completer, editor, widget: panel, session });
		};

		// Update the handler whenever the prompt or session changes
		panel.content.activeCellChanged.connect(updateConnector);
		panel.sessionContext.sessionChanged.connect(updateConnector);
	}

	private _registerConsole = (sender: IConsoleTracker, widget: ConsolePanel): void => {
		const anchor = widget.console;
		const editor = anchor.promptCell?.editor;
		const session = anchor.sessionContext.session ?? undefined;
		// TODO: CompletionConnector assumes editor and session are not null
		const model = new CompleterModel();
		const completer = new Completer({ editor, model, renderer: this._renderer });
		this._updateProviders({ completer, editor, widget, session });
		const providers = Array.from(this._providers.values());
		const handler = new CompletionHandler({ completer, providers });

		// Hide the widget when it first loads.
		completer.hide();

		// Associate the handler with the parent widget.
		this._handlers[widget.id] = handler;

		// Set the handler's editor.
		handler.editor = editor ?? null;

		// Attach the completer widget.
		Widget.attach(completer, document.body);

		// Listen for parent disposal.
		widget.disposed.connect(() => {
			delete this._handlers[widget.id];
			completer.dispose();
			handler.dispose();
		});

		const updateConnector = () => {
			const editor = anchor.promptCell?.editor;
			const session = anchor.sessionContext.session ?? undefined;

			handler.editor = editor ?? null;
			// TODO: CompletionConnector assumes editor and session are not null
			this._updateProviders({ completer, editor, widget, session });
		};

		// Update the handler whenever the prompt or session changes
		anchor.promptCellCreated.connect(updateConnector);
		anchor.sessionContext.sessionChanged.connect(updateConnector);
	}
	
	private _registerEditor = (sender: IEditorTracker, widget: any): void => {
		// Keep a list of active ISessions so that we can
    // clean them up when they are no longer needed.
    const activeSessions: {
      [id: string]: Session.ISessionConnection;
    } = {};
		const sessions = this._app.serviceManager.sessions;
		const editor = widget.content.editor;

		// Initially create the handler with the contextConnector.
		// If a kernel session is found matching this file editor,
		// it will be replaced in onRunningChanged().

		// TODO: CompletionConnector assumes editor and session are not null
		const model = new CompleterModel();
		const completer = new Completer({ editor, model, renderer: this._renderer });
		this._updateProviders({ completer, editor, widget });
		const providers = Array.from(this._providers.values());
		const handler = new CompletionHandler({ completer, providers });

		// Hide the widget when it first loads.
		completer.hide();

		// Associate the handler with the parent widget.
		this._handlers[widget.id] = handler;

		// Set the handler's editor.
		handler.editor = editor ?? null;

		// Attach the completer widget.
		Widget.attach(completer, document.body);

		// Listen for parent disposal.
		widget.disposed.connect(() => {
			delete this._handlers[widget.id];
			completer.dispose();
			handler.dispose();
		});

		// When the list of running sessions changes,
		// check to see if there are any kernels with a
		// matching path for this file editor.
		const onRunningChanged = (
			sender: Session.IManager,
			models: Session.IModel[]
		) => {
			const oldSession = activeSessions[widget.id];
			// Search for a matching path.
			const model = find(models, m => m.path === widget.context.path);
			if (model) {
				// If there is a matching path, but it is the same
				// session as we previously had, do nothing.
				if (oldSession && oldSession.id === model.id) {
					return;
				}
				// Otherwise, dispose of the old session and reset to
				// a new CompletionConnector.
				if (oldSession) {
					delete activeSessions[widget.id];
					oldSession.dispose();
				}
				const session = sessions.connectTo({ model });
				this._updateProviders({ completer, editor, widget, session });
				activeSessions[widget.id] = session;
			} else {
				// If we didn't find a match, make sure
				// the connector is the contextConnector and
				// dispose of any previous connection.
				this._updateProviders({ completer, editor, widget });
				if (oldSession) {
					delete activeSessions[widget.id];
					oldSession.dispose();
				}
			}
		};
		onRunningChanged(sessions, toArray(sessions.running()));
		sessions.runningChanged.connect(onRunningChanged);

		// When the widget is disposed, do some cleanup.
		widget.disposed.connect(() => {
			sessions.runningChanged.disconnect(onRunningChanged);
			const session = activeSessions[widget.id];
			if (session) {
				delete activeSessions[widget.id];
				session.dispose();
			}
		});
	}

	private _providers: Map<string, ICompletionProvider>;
  private _renderer: Completer.IRenderer;
	private _handlers: { [id: string]: CompletionHandler } = {};

	private _app: JupyterFrontEnd;
	private _consoles: IConsoleTracker;
	private _editors: IEditorTracker;
	private _notebooks: INotebookTracker;
}

export namespace CompletionManager {
  /**
   * The instantiation options for cell completion handlers.
   */
  export interface IOptions {
		app: JupyterFrontEnd;
    consoles: IConsoleTracker;
		editors: IEditorTracker;
		notebooks: INotebookTracker;
  }
}