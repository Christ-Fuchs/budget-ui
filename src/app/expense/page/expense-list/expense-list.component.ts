import { Component, inject } from '@angular/core';
import {
  InfiniteScrollCustomEvent,
  IonButton,
  IonButtons,
  IonCol,
  IonContent,
  IonFab,
  IonFabButton,
  IonFooter,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonInput,
  IonItem,
  IonItemDivider,
  IonItemGroup,
  IonLabel,
  IonList,
  IonMenuButton,
  IonNote,
  IonProgressBar,
  IonRefresher,
  IonRefresherContent,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  ModalController,
  RefresherCustomEvent,
  ViewDidEnter,
  ViewDidLeave
} from '@ionic/angular/standalone';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ExpenseService } from '../../service/expense.service';
import ExpenseModalComponent from '../../component/expense-modal/expense-modal.component';
import { ToastService } from '../../../shared/service/toast.service';
import { CategoryService } from '../../../category/service/category.service';
import { Category, Expense, ExpenseCriteria, SortOption } from '../../../shared/domain';
import { debounce, finalize, interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-expense-list',
  templateUrl: './expense-list.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ExpenseModalComponent,
    ReactiveFormsModule,

    // Ionic
    IonButtons,
    IonButton,
    IonCol,
    IonContent,
    IonFab,
    IonFabButton,
    IonFooter,
    IonGrid,
    IonHeader,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonInput,
    IonItem,
    IonItemDivider,
    IonItemGroup,
    IonLabel,
    IonList,
    IonMenuButton,
    IonNote,
    IonProgressBar,
    IonRefresher,
    IonRefresherContent,
    IonRow,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar
  ]
})
export default class ExpenseListComponent implements ViewDidEnter, ViewDidLeave {
  // Services
  private readonly expenseService = inject(ExpenseService);
  private readonly categoryService = inject(CategoryService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastService = inject(ToastService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  // Eigenschaften
  currentDate = new Date(); // Für die Monatsnavigation
  expenses: Expense[] | null = null; // Dynamische Expenses
  categories: Category[] = []; // Dynamische Kategorien
  expenseGroups: { date: Date; expenses: Expense[] }[] = []; // Gruppierte Ausgaben nach Datum
  lastPageReached = false;
  loading = false;

  // Suchkriterien und Subscription
  searchCriteria: ExpenseCriteria = { page: 0, size: 25, sort: 'date,desc' };
  private searchFormSubscription?: Subscription;

  // Sortier- und Suchoptionen
  readonly sortOptions: SortOption[] = [
    { label: 'Created at (newest first)', value: 'createdAt,desc' }, // Neue Option
    { label: 'Created at (oldest first)', value: 'createdAt,asc' }, // Neue Option
    { label: 'Date (newest first)', value: 'date,desc' },
    { label: 'Date (oldest first)', value: 'date,asc' },
    { label: 'Name (A-Z)', value: 'name,asc' },
    { label: 'Name (Z-A)', value: 'name,desc' }
  ];

  readonly searchForm = this.formBuilder.group({
    name: [''],
    sort: ['date,desc'],
    category: ['']
  });

  ionViewDidEnter(): void {
    this.loadCategories(); // Dynamische Kategorien laden
    this.loadExpenses(); // Initiales Laden der Expenses
    this.searchFormSubscription = this.searchForm.valueChanges
      .pipe(debounce(searchParams => interval(searchParams.name?.length ? 400 : 0)))
      .subscribe(searchParams => {
        this.searchCriteria = { ...this.searchCriteria, ...searchParams, page: 0 };
        this.loadExpenses();
      });
  }

  ionViewDidLeave(): void {
    this.searchFormSubscription?.unsubscribe();
    this.searchFormSubscription = undefined;
  }

  addMonths(months: number): void {
    this.currentDate.setMonth(this.currentDate.getMonth() + months);
  }

  private loadCategories(next?: () => void): void {
    // Überprüft, ob ein Name-Filter vorhanden ist
    if (!this.searchCriteria.name) delete this.searchCriteria.name;

    // Setzt den Ladezustand auf `true`
    this.loading = true;

    // Ruft Kategorien vom Service ab
    this.categoryService
      .getCategories(this.searchCriteria)
      .pipe(
        finalize(() => {
          this.loading = false; // Setzt den Ladezustand auf `false`
          if (next) next(); // Führt die `next`-Callback-Funktion aus, falls vorhanden
        })
      )
      .subscribe({
        next: categories => {
          // Initialisiert die Kategorienliste bei der ersten Seite oder falls sie `null` ist
          if (this.searchCriteria.page === 0 || !this.categories) this.categories = [];
          // Fügt die geladenen Kategorien zur bestehenden Liste hinzu
          this.categories.push(...categories.content);
          // Prüft, ob die letzte Seite erreicht wurde
          this.lastPageReached = categories.last;
        },
        error: error => {
          // Zeigt eine Warnung an, falls die Kategorien nicht geladen werden können
          this.toastService.displayWarningToast('Could not load categories', error);
        }
      });
  }

  private loadExpenses(next?: () => void): void {
    this.loading = true;
    this.expenseService
      .getExpenses(this.searchCriteria)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: expenses => {
          this.expenseGroups = this.groupExpensesByDate(expenses.content);
          this.lastPageReached = expenses.last;
          if (next) next();
        },
        error: error => this.toastService.displayWarningToast('Could not load expenses', error)
      });
  }

  private groupExpensesByDate(expenses: Expense[]): { date: Date; expenses: Expense[] }[] {
    const groups: { [key: string]: Expense[] } = {};
    for (const expense of expenses) {
      const dateKey = new Date(expense.date).toISOString().split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(expense);
    }
    return Object.keys(groups).map(date => ({
      date: new Date(date),
      expenses: groups[date]
    }));
  }

  trackByFn<T extends { id?: string; value?: string }>(index: number, item: T): string | null {
    return item?.id ?? item?.value ?? null;
  }

  trackByDateGroup(index: number, group: { date: Date; expenses: Expense[] }): string {
    return group.date.toISOString();
  }

  trackByExpenseId(index: number, expense: Expense): string {
    return expense.id;
  }

  async openModal(expense?: Expense): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ExpenseModalComponent,
      componentProps: { expense: expense ?? {} }
    });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'refresh') this.loadExpenses();
  }

  // Methode zum Laden der nächsten Page: Load Next Category Page
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
