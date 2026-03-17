import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideMonacoEditor } from 'ngx-monaco-editor-v2';
import { QuestViewComponent } from './components/quest-view/quest-view.component';
import { TreeVisualizerComponent } from './components/tree-visualizer/tree-visualizer.component';
import { registerObjectScript } from './monaco-config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter([
      { path: 'quest', component: QuestViewComponent },
      { path: 'tree', component: TreeVisualizerComponent },
      {
        path: 'free-practice',
        loadComponent: () =>
          import('./components/free-practice/free-practice.component').then(
            m => m.FreePracticeComponent
          ),
      },
      { path: '**', redirectTo: 'quest' },
    ]),
    provideMonacoEditor({
      baseUrl: 'assets',
      onMonacoLoad: registerObjectScript,
    }),
  ],
};
