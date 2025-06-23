import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../shared/auth.service';

import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    TabViewModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <p-card class="w-full max-w-md">
        <ng-template pTemplate="header">
          <div class="text-center p-4">
            <h1 class="text-2xl font-bold text-gray-800">Sivira Step</h1>
            <p class="text-gray-600 mt-2">SNS自動DM管理システム</p>
          </div>
        </ng-template>
        
        <p-tabView>
          <p-tabPanel header="ログイン">
            <form (ngSubmit)="signIn()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <input 
                  type="email" 
                  pInputText 
                  [(ngModel)]="loginEmail" 
                  name="loginEmail"
                  class="w-full"
                  required
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                <p-password 
                  [(ngModel)]="loginPassword" 
                  name="loginPassword"
                  [feedback]="false"
                  [toggleMask]="true"
                  styleClass="w-full"
                  inputStyleClass="w-full"
                  required
                ></p-password>
              </div>
              
              <p-button 
                type="submit" 
                label="ログイン" 
                [loading]="loading"
                styleClass="w-full"
              ></p-button>
            </form>
          </p-tabPanel>
          
          <p-tabPanel header="新規登録">
            <form (ngSubmit)="signUp()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <input 
                  type="email" 
                  pInputText 
                  [(ngModel)]="signupEmail" 
                  name="signupEmail"
                  class="w-full"
                  required
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                <p-password 
                  [(ngModel)]="signupPassword" 
                  name="signupPassword"
                  [feedback]="true"
                  [toggleMask]="true"
                  styleClass="w-full"
                  inputStyleClass="w-full"
                  required
                ></p-password>
              </div>
              
              <p-button 
                type="submit" 
                label="新規登録" 
                [loading]="loading"
                styleClass="w-full"
              ></p-button>
            </form>
          </p-tabPanel>
        </p-tabView>
      </p-card>
    </div>
    
    <p-toast></p-toast>
  `
})
export class AuthComponent {
  loginEmail = '';
  loginPassword = '';
  signupEmail = '';
  signupPassword = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {
    this.authService.user$.subscribe(user => {
      if (user) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  async signIn() {
    if (!this.loginEmail || !this.loginPassword) return;
    
    this.loading = true;
    try {
      await this.authService.signIn(this.loginEmail, this.loginPassword);
      this.messageService.add({
        severity: 'success',
        summary: 'ログイン成功',
        detail: 'ダッシュボードに移動します'
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'ログインエラー',
        detail: 'メールアドレスまたはパスワードが正しくありません'
      });
    }
    this.loading = false;
  }

  async signUp() {
    if (!this.signupEmail || !this.signupPassword) return;
    
    this.loading = true;
    try {
      await this.authService.signUp(this.signupEmail, this.signupPassword);
      this.messageService.add({
        severity: 'success',
        summary: '登録成功',
        detail: 'アカウントが作成されました'
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: '登録エラー',
        detail: error.message || 'アカウント作成に失敗しました'
      });
    }
    this.loading = false;
  }
}