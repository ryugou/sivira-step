import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../shared/auth.service';
import { SNSService } from '../shared/sns.service';
import { SNSAccountsComponent } from './components/sns-accounts.component';

@Component({
  selector: 'app-dashboard-simple',
  standalone: true,
  imports: [CommonModule, SNSAccountsComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Top Navigation -->
      <div class="bg-white shadow-sm border-b">
        <div class="px-4 py-3 flex justify-between items-center">
          <div class="flex items-center">
            <button
              class="lg:hidden mr-3 p-2 text-gray-500 hover:text-gray-700"
              (click)="sidebarVisible = !sidebarVisible"
            >
              ☰
            </button>
            <h1 class="text-xl font-bold text-gray-800">Sivira Step</h1>
          </div>

          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-600">
              {{ currentUser?.email }}
            </span>
            <button
              class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              (click)="logout()"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>

      <div class="flex">
        <!-- Desktop Sidebar -->
        <aside
          class="hidden lg:block w-64 bg-white shadow-sm h-[calc(100vh-64px)]"
        >
          <nav class="p-4">
            <ul class="space-y-2">
              <li>
                <button
                  class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center space-x-3"
                  [class.bg-blue-50]="currentView === 'accounts'"
                  [class.text-blue-600]="currentView === 'accounts'"
                  (click)="setCurrentView('accounts')"
                >
                  <span>👥</span>
                  <span>SNSアカウント管理</span>
                </button>
              </li>
              <li>
                <button
                  class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center space-x-3"
                  [class.bg-blue-50]="currentView === 'hashtags'"
                  [class.text-blue-600]="currentView === 'hashtags'"
                  (click)="setCurrentView('hashtags')"
                >
                  <span>#</span>
                  <span>ハッシュタグ登録</span>
                </button>
              </li>
              <li>
                <button
                  class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center space-x-3"
                  [class.bg-blue-50]="currentView === 'posts'"
                  [class.text-blue-600]="currentView === 'posts'"
                  (click)="setCurrentView('posts')"
                >
                  <span>💬</span>
                  <span>投稿登録</span>
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        <!-- Mobile Sidebar -->
        <div
          *ngIf="sidebarVisible"
          class="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50"
          (click)="sidebarVisible = false"
        >
          <div
            class="bg-white w-80 h-full p-4"
            (click)="$event.stopPropagation()"
          >
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-semibold">メニュー</h3>
              <button (click)="sidebarVisible = false">✕</button>
            </div>

            <nav>
              <ul class="space-y-2">
                <li>
                  <button
                    class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center space-x-3"
                    [class.bg-blue-50]="currentView === 'accounts'"
                    [class.text-blue-600]="currentView === 'accounts'"
                    (click)="setCurrentView('accounts'); sidebarVisible = false"
                  >
                    <span>👥</span>
                    <span>SNSアカウント管理</span>
                  </button>
                </li>
                <li>
                  <button
                    class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center space-x-3"
                    [class.bg-blue-50]="currentView === 'hashtags'"
                    [class.text-blue-600]="currentView === 'hashtags'"
                    (click)="setCurrentView('hashtags'); sidebarVisible = false"
                  >
                    <span>#</span>
                    <span>ハッシュタグ登録</span>
                  </button>
                </li>
                <li>
                  <button
                    class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center space-x-3"
                    [class.bg-blue-50]="currentView === 'posts'"
                    [class.text-blue-600]="currentView === 'posts'"
                    (click)="setCurrentView('posts'); sidebarVisible = false"
                  >
                    <span>💬</span>
                    <span>投稿登録</span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <!-- Main Content -->
        <main class="flex-1 p-6">
          <div class="max-w-4xl mx-auto">
            <app-sns-accounts
              *ngIf="currentView === 'accounts'"
            ></app-sns-accounts>

            <div
              *ngIf="currentView === 'hashtags'"
              class="bg-white rounded-lg shadow p-6"
            >
              <h2 class="text-xl font-semibold mb-4 flex items-center">
                <span class="mr-2">#</span>
                ハッシュタグ登録
              </h2>
              <p class="text-gray-600 mb-6">
                キャンペーン用ハッシュタグを登録し、該当投稿者へ自動DM送信を設定できます。
              </p>

              <div
                class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"
              >
                <div class="flex">
                  <span class="text-yellow-600 mr-2">⚠️</span>
                  <div>
                    <p class="font-medium text-yellow-800">SNS連携が必要です</p>
                    <p class="text-sm text-yellow-700">
                      ハッシュタグ登録を行うには、まずSNSアカウント連携を完了してください。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              *ngIf="currentView === 'posts'"
              class="bg-white rounded-lg shadow p-6"
            >
              <h2 class="text-xl font-semibold mb-4 flex items-center">
                <span class="mr-2">💬</span>
                投稿登録
              </h2>
              <p class="text-gray-600 mb-6">
                特定の投稿へのリプライ投稿者に対して、自動DM送信を設定できます。
              </p>

              <div
                class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"
              >
                <div class="flex">
                  <span class="text-yellow-600 mr-2">⚠️</span>
                  <div>
                    <p class="font-medium text-yellow-800">SNS連携が必要です</p>
                    <p class="text-sm text-yellow-700">
                      投稿登録を行うには、まずSNSアカウント連携を完了してください。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
})
export class DashboardSimpleComponent implements OnInit {
  currentView: 'accounts' | 'hashtags' | 'posts' = 'accounts';
  sidebarVisible = false;
  currentUser: any = null;

  constructor(
    private authService: AuthService,
    private snsService: SNSService,
    private router: Router
  ) {
    this.currentUser = this.authService.currentUser;
  }

  ngOnInit() {
    this.authService.user$.subscribe((user) => {
      this.currentUser = user;
    });
  }

  setCurrentView(view: 'accounts' | 'hashtags' | 'posts') {
    this.currentView = view;
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/auth']);
  }

  async connectSNS(snsType: 'x' | 'instagram' | 'threads' | 'tiktok') {
    try {
      await this.snsService.connectSNS(snsType);
    } catch (error) {
      console.error('SNS接続エラー:', error);
      alert(`SNS接続エラー: ${error}`);
    }
  }
}
