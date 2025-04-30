@Component({
  selector: 'app-autre-component',
  templateUrl: './autre-component.html',
  styleUrls: ['./autre-component.css'],
  standalone: true,
  imports: [CommonModule, /* autres imports */, TranslatePipe],
})
export class AutreComponent {
  // ...
} 