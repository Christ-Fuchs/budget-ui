import { Component, inject } from '@angular/core';
import {
  InfiniteScrollCustomEvent,
  IonButtons,
  IonCol,
  IonContent,
  IonFab,
  IonFabButton,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonProgressBar,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  ModalController,
  RefresherCustomEvent,
  ViewDidEnter,
  ViewDidLeave
} from '@ionic/angular/standalone';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms'; // inklusive NonNullableFormBuilder.
import { CommonModule } from '@angular/common'; // Sicherstellen, dass CommonModule importiert ist
import { addIcons } from 'ionicons';
import { add, alertCircleOutline, search, swapVertical } from 'ionicons/icons';
import ExpenseModalComponent from '../../component/expense-modal/expense-modal.component';
import { ExpenseService } from '../../service/expense.service';
import { ToastService } from '../../../shared/service/toast.service';
import { Expense, ExpenseCriteria, SortOption } from '../../../shared/domain'; // inklusive SortOption importiert
import { debounce, finalize, interval, Subscription } from 'rxjs'; // inklusive Subscription.

@Component({
  selector: 'app-expense-list',
  templateUrl: './expense-list.component.html',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule, // Hier korrekt hinzugefügt

    // Ionic
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonProgressBar,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonGrid,
    IonRow,
    IonCol,
    IonList,
    IonItem,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonLabel,
    IonSkeletonText,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonFab,
    IonFabButton
  ]
})
export default class ExpenseListComponent implements ViewDidEnter, ViewDidLeave {
  // Dependency Injection (DI)
  private readonly expenseService = inject(ExpenseService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastService = inject(ToastService);
  private readonly formBuilder = inject(NonNullableFormBuilder); // NonNullableFormBuilder hinzugefügt

  // Eigenschaften
  expenses: Expense[] | null = null;
  readonly initialSort = 'name,asc';
  lastPageReached = false;
  loading = false;
  searchCriteria: ExpenseCriteria = { page: 0, size: 25, sort: this.initialSort };

  // Suchfeld Eigenschaften Variablen definieren
  private searchFormSubscription?: Subscription; // Subscription für das Suchformular hinzugefügt
  readonly sortOptions: SortOption[] = [
    { label: 'Created at (newest first)', value: 'createdAt,desc' },
    { label: 'Created at (oldest first)', value: 'createdAt,asc' },
    { label: 'Name (A-Z)', value: 'name,asc' },
    { label: 'Name (Z-A)', value: 'name,desc' }
  ]; // Sortieroptionen hinzugefügt

  readonly searchForm = this.formBuilder.group({
    name: [''], // Suchfeld
    sort: [this.initialSort] // Standardsortierung
  }); // Suchformular hinzugefügt

  constructor() {
    // Add all used Ionic icons
    addIcons({ swapVertical, search, alertCircleOutline, add });
  }

  ionViewDidEnter(): void {
    // Initiales Laden der Kategorien
    this.loadExpenses();

    // Abonnement für das Suchformular
    this.searchFormSubscription = this.searchForm.valueChanges
      .pipe(debounce(searchParams => interval(searchParams.name?.length ? 400 : 0)))
      .subscribe(searchParams => {
        this.searchCriteria = { ...this.searchCriteria, ...searchParams, page: 0 };
        this.loadExpenses();
      });
  }

  ionViewDidLeave(): void {
    // Abonnement des Suchformulars aufräumen
    this.searchFormSubscription?.unsubscribe();
    this.searchFormSubscription = undefined;
  }

  // Angepasste Methode mit Übergabe der Kategorie an das Modal
  async openModal(expense?: Expense): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ExpenseModalComponent,
      componentProps: { expense: expense ?? {} } // Kategorie oder leeres Objekt übergeben
    });
    modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'refresh') this.reloadExpenses(); // Aktualisiert die Liste, falls ein Refresh angefordert wurde
  }

  private loadExpenses(next?: () => void): void {
    // Überprüft, ob ein Name-Filter vorhanden ist
    if (!this.searchCriteria.name) delete this.searchCriteria.name;

    // Setzt den Ladezustand auf `true`
    this.loading = true;

    // Ruft Expenses vom Service ab
    this.expenseService
      .getExpenses(this.searchCriteria)
      .pipe(
        finalize(() => {
          this.loading = false; // Setzt den Ladezustand auf `false`
          if (next) next(); // Führt die `next`-Callback-Funktion aus, falls vorhanden
        })
      )
      .subscribe({
        next: expenses => {
          // Initialisiert die Kategorienliste bei der ersten Seite oder falls sie `null` ist
          if (this.searchCriteria.page === 0 || !this.expenses) this.expenses = [];
          // Fügt die geladenen Kategorien zur bestehenden Liste hinzu
          this.expenses.push(...expenses.content);
          // Prüft, ob die letzte Seite erreicht wurde
          this.lastPageReached = expenses.last;
        },
        error: error => {
          // Zeigt eine Warnung an, falls die Kategorien nicht geladen werden können
          this.toastService.displayWarningToast('Could not load expenses', error);
        }
      });
  }

  // Track-By Funktionen
  trackByFn(index: number): number {
    return index;
  }

  trackByExpenseId(index: number, expense: Expense): string {
    return <string>expense.id;
  }

  // Methode zum Laden der nächsten Page: Load Next Expense Page
  loadNextExpensePage($event: InfiniteScrollCustomEvent): void {
    this.searchCriteria.page++;
    this.loadExpenses(() => $event.target.complete());
  }

  // Methode zum Neuladen der Kategorien mit dem Refresher
  reloadExpenses($event?: RefresherCustomEvent): void {
    this.searchCriteria.page = 0; // Zurücksetzen auf die erste Seite
    this.loadExpenses(() => $event?.target.complete()); // Beendet das Refresher-Event nach dem Laden
  }
}
