import { Component, inject } from '@angular/core';
import { IrisConnectionService } from '../../services/iris-connection.service';

@Component({
  selector: 'app-connection-indicator',
  standalone: true,
  imports: [],
  templateUrl: './connection-indicator.component.html',
  styleUrl: './connection-indicator.component.scss',
})
export class ConnectionIndicatorComponent {
  readonly connectionSvc = inject(IrisConnectionService);
}
