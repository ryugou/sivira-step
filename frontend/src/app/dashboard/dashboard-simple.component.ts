import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../shared/auth.service';
import { SNSService } from '../shared/sns.service';
import { SNSAccountsComponent } from './components/sns-accounts.component';
import { HashtagRegistrationComponent } from './components/hashtag-registration.component';
import { PostRegistrationComponent } from './components/post-registration.component';
import { HashtagManagementComponent } from './components/hashtag-management.component';
import { PostManagementComponent } from './components/post-management.component';

@Component({
  selector: 'app-dashboard-simple',
  standalone: true,
  imports: [CommonModule, SNSAccountsComponent, HashtagRegistrationComponent, PostRegistrationComponent, HashtagManagementComponent, PostManagementComponent],
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
                  [class.bg-blue-50]="currentView === 'hashtag-management'"
                  [class.text-blue-600]="currentView === 'hashtag-management'"
                  (click)="setCurrentView('hashtag-management')"
                >
                  <span>📋</span>
                  <span>ハッシュタグ管理</span>
                </button>
              </li>
              <li>
                <button
                  class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center space-x-3"
                  [class.bg-blue-50]="currentView === 'post-management'"
                  [class.text-blue-600]="currentView === 'post-management'"
                  (click)="setCurrentView('post-management')"
                >
                  <span>📝</span>
                  <span>投稿管理</span>
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
                    [class.bg-blue-50]="currentView === 'hashtag-management'"
                    [class.text-blue-600]="currentView === 'hashtag-management'"
                    (click)="setCurrentView('hashtag-management'); sidebarVisible = false"
                  >
                    <span>📋</span>
                    <span>ハッシュタグ管理</span>
                  </button>
                </li>
                <li>
                  <button
                    class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center space-x-3"
                    [class.bg-blue-50]="currentView === 'post-management'"
                    [class.text-blue-600]="currentView === 'post-management'"
                    (click)="setCurrentView('post-management'); sidebarVisible = false"
                  >
                    <span>📝</span>
                    <span>投稿管理</span>
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

            <app-hashtag-registration
              *ngIf="currentView === 'hashtags'"
              (registrationComplete)="onHashtagRegistrationComplete()"
            ></app-hashtag-registration>

            <app-post-registration
              *ngIf="currentView === 'posts'"
              (registrationComplete)="onPostRegistrationComplete()"
            ></app-post-registration>

            <app-hashtag-management
              *ngIf="currentView === 'hashtag-management'"
              (navigateToView)="onNavigateToView($event)"
            ></app-hashtag-management>

            <app-post-management
              *ngIf="currentView === 'post-management'"
              (navigateToView)="onNavigateToView($event)"
            ></app-post-management>
          </div>
        </main>
      </div>
    </div>
  `,
})
export class DashboardSimpleComponent implements OnInit {
  currentView: 'accounts' | 'hashtags' | 'posts' | 'hashtag-management' | 'post-management' = 'accounts';
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

  setCurrentView(view: 'accounts' | 'hashtags' | 'posts' | 'hashtag-management' | 'post-management') {
    this.currentView = view;
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/auth']);
  }

  onHashtagRegistrationComplete() {
    this.setCurrentView('hashtag-management');
  }

  onPostRegistrationComplete() {
    this.setCurrentView('post-management');
  }

  onNavigateToView(view: string) {
    this.setCurrentView(view as any);
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
