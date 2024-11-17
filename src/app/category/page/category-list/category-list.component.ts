import { Component, inject } from '@angular/core';
import {
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
  ViewDidEnter
} from '@ionic/angular/standalone';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; // Sicherstellen, dass CommonModule importiert ist
import { addIcons } from 'ionicons';
import { add, alertCircleOutline, search, swapVertical } from 'ionicons/icons';
import CategoryModalComponent from '../../component/category-modal/category-modal.component';
import { CategoryService } from '../../service/category.service';
import { ToastService } from '../../../shared/service/toast.service';
import { Category, CategoryCriteria } from '../../../shared/domain';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-category-list',
  templateUrl: './category-list.component.html',
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
export default class CategoryListComponent implements ViewDidEnter {
  // Dependency Injection (DI)
  private readonly categoryService = inject(CategoryService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastService = inject(ToastService);

  // Eigenschaften
  categories: Category[] | null = null;
  readonly initialSort = 'name,asc';
  lastPageReached = false;
  loading = false;
  searchCriteria: CategoryCriteria = { page: 0, size: 25, sort: this.initialSort };

  constructor() {
    // Add all used Ionic icons
    addIcons({ swapVertical, search, alertCircleOutline, add });
  }

  ionViewDidEnter(): void {
    this.loadCategories();
  }

  async openModal(category?: Category): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: CategoryModalComponent,
      componentProps: { category } // Übergebe die Kategorie als Eigenschaft an das Modal
    });
    modal.present();
    const { role } = await modal.onWillDismiss();
    console.log('role', role, 'category:', category);
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
  // Track-By Funktionen
  trackByFn(index: number): number {
    return index;
  }

  trackByCategoryId(index: number, category: Category): string {
    return <string>category.id;
  }
}
