import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../shared/auth.service';

@Component({
  selector: 'app-auth-simple',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div class="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <div class="text-center mb-6">
          <h1 class="text-2xl font-bold text-gray-800">Sivira Step</h1>
          <p class="text-gray-600 mt-2">SNS自動DM管理システム</p>
        </div>
        
        <div class="mb-6">
          <div class="flex border-b">
            <button 
              class="px-4 py-2 text-sm font-medium"
              [class]="isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'"
              (click)="isLogin = true"
            >
              ログイン
            </button>
            <button 
              class="px-4 py-2 text-sm font-medium"
              [class]="!isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'"
              (click)="isLogin = false"
            >
              新規登録
            </button>
          </div>
        </div>

        <!-- Google認証ボタン -->
        <button 
          (click)="signInWithGoogle()"
          [disabled]="loading"
          class="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center space-x-2 mb-4"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>{{ loading ? '処理中...' : 'Googleでログイン' }}</span>
        </button>

        <!-- 区切り線 -->
        <div class="flex items-center my-4">
          <div class="flex-1 border-t border-gray-300"></div>
          <div class="px-3 text-sm text-gray-500">または</div>
          <div class="flex-1 border-t border-gray-300"></div>
        </div>

        <form (ngSubmit)="isLogin ? signIn() : signUp()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input 
              type="email" 
              [(ngModel)]="email" 
              name="email"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <input 
              type="password" 
              [(ngModel)]="password" 
              name="password"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <button 
            type="submit" 
            [disabled]="loading"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {{ loading ? '処理中...' : (isLogin ? 'ログイン' : '新規登録') }}
          </button>
        </form>
        
        <div *ngIf="message" class="mt-4 p-3 rounded-md" [class]="messageClass">
          {{ message }}
        </div>
      </div>
    </div>
  `
})
export class AuthSimpleComponent {
  isLogin = true;
  email = '';
  password = '';
  loading = false;
  message = '';
  messageClass = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.authService.user$.subscribe(user => {
      if (user) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  async signIn() {
    if (!this.email || !this.password) return;
    
    this.loading = true;
    this.message = '';
    try {
      await this.authService.signIn(this.email, this.password);
      this.showMessage('ログイン成功！ダッシュボードに移動します', 'success');
    } catch (error: any) {
      this.showMessage('ログインエラー: メールアドレスまたはパスワードが正しくありません', 'error');
    }
    this.loading = false;
  }

  async signUp() {
    if (!this.email || !this.password) return;
    
    this.loading = true;
    this.message = '';
    try {
      await this.authService.signUp(this.email, this.password);
      this.showMessage('登録成功！アカウントが作成されました', 'success');
    } catch (error: any) {
      this.showMessage('登録エラー: ' + (error.message || 'アカウント作成に失敗しました'), 'error');
    }
    this.loading = false;
  }

  async signInWithGoogle() {
    this.loading = true;
    this.message = '';
    try {
      await this.authService.signInWithGoogle();
      this.showMessage('Googleログイン成功！ダッシュボードに移動します', 'success');
    } catch (error: any) {
      this.showMessage('Googleログインエラー: ' + (error.message || 'ログインに失敗しました'), 'error');
    }
    this.loading = false;
  }

  private showMessage(message: string, type: 'success' | 'error') {
    this.message = message;
    this.messageClass = type === 'success' 
      ? 'bg-green-100 text-green-700 border border-green-300'
      : 'bg-red-100 text-red-700 border border-red-300';
  }
}