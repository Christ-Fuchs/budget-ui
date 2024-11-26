import { Routes } from '@angular/router';

export const expensesPath = 'expenses';

const expenseRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./page/expense-list/expense-list.component'),
    title: 'Expenses'
  }
];

export default expenseRoutes;
