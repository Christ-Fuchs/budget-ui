import { Component, inject, Input, ViewChild } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonTitle,
  IonToolbar,
  ModalController,
  ViewDidEnter,
  ViewWillEnter
} from '@ionic/angular/standalone';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { addIcons } from 'ionicons';
import { close, save, text, trash } from 'ionicons/icons';
import { CategoryService } from '../../service/category.service';
import { LoadingIndicatorService } from '../../../shared/service/loading-indicator.service';
import { ToastService } from '../../../shared/service/toast.service';
import { ActionSheetService } from '../../../shared/service/action-sheet.service'; // ActionSheetService
import { Category, CategoryUpsertDto } from '../../../shared/domain';
import { finalize, mergeMap } from 'rxjs';

@Component({
  selector: 'app-category-modal',
  templateUrl: './category-modal.component.html',
  standalone: true,
  imports: [
    ReactiveFormsModule,

    // Ionic
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonItem,
    IonInput,
    IonFab,
    IonFabButton
  ]
})
export default class CategoryModalComponent implements ViewWillEnter, ViewDidEnter {
  // Dependency Injection (DI)
  private readonly categoryService = inject(CategoryService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly loadingIndicatorService = inject(LoadingIndicatorService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastService = inject(ToastService);
  private readonly actionSheetService = inject(ActionSheetService); // ActionSheetService

  // Formular für die Kategorie
  readonly categoryForm = this.formBuilder.group({
    id: [null! as string], // hidden (verstecktes Feld)
    name: ['', [Validators.required, Validators.maxLength(40)]]
  });

  // @Input für die Kategorie
  @Input() category: Category = {} as Category;

  // Zugriff auf das Eingabefeld für den Namen
  @ViewChild('nameInput') nameInput?: IonInput;

  constructor() {
    // Add all used Ionic icons
    addIcons({ close, save, text, trash });
  }

  // Werte der Kategorie in das Formular lädt
  ionViewWillEnter(): void {
    this.categoryForm.patchValue(this.category);
  }

  // Fokus auf das Eingabefeld setzen
  ionViewDidEnter(): void {
    this.nameInput?.setFocus();
  }

  cancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  save(): void {
    this.loadingIndicatorService.showLoadingIndicator({ message: 'Saving category' }).subscribe(loadingIndicator => {
      const category = this.categoryForm.value as CategoryUpsertDto;
      this.categoryService
        .upsertCategory(category)
        .pipe(finalize(() => loadingIndicator.dismiss()))
        .subscribe({
          next: () => {
            this.toastService.displaySuccessToast('Category saved');
            this.modalCtrl.dismiss(null, 'refresh');
          },
          error: error => this.toastService.displayWarningToast('Could not save category', error)
        });
    });
  }

  delete(): void {
    this.actionSheetService
      .showDeletionConfirmation('Are you sure you want to delete this category?')
      .pipe(mergeMap(() => this.loadingIndicatorService.showLoadingIndicator({ message: 'Deleting category' })))
      .subscribe(loadingIndicator => {
        this.categoryService
          .deleteCategory(this.category.id!)
          .pipe(finalize(() => loadingIndicator.dismiss()))
          .subscribe({
            next: () => {
              this.toastService.displaySuccessToast('Category deleted');
              this.modalCtrl.dismiss(null, 'refresh');
            },
            error: error => this.toastService.displayWarningToast('Could not delete category', error)
          });
      });
  }
}
