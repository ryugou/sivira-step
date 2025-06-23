import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../shared/auth.service';
import { SNSService, SNSAccount } from '../shared/sns.service';

import { MenubarModule } from 'primeng/menubar';
import { SidebarModule } from 'primeng/sidebar';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MenubarModule, SidebarModule, ButtonModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Top Navigation -->
      <div class="bg-white shadow-sm border-b">
        <div class="px-4 py-3 flex justify-between items-center">
          <div class="flex items-center">
            <button
              class="lg:hidden mr-3 p-2 text-gray-500 hover:text-gray-700"
              (click)="sidebarVisible = true"
            >
              <i class="pi pi-bars text-xl"></i>
            </button>
            <h1 class="text-xl font-bold text-gray-800">Sivira Step</h1>
          </div>

          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-600">
              {{ currentUser?.email }}
            </span>
            <p-button
              icon="pi pi-sign-out"
              label="ログアウト"
              [text]="true"
              (onClick)="logout()"
            ></p-button>
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
                  <i class="pi pi-users"></i>
                  <span>SNSアカウント連携</span>
                </button>
              </li>
              <li>
                <button
                  class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center space-x-3"
                  [class.bg-blue-50]="currentView === 'hashtags'"
                  [class.text-blue-600]="currentView === 'hashtags'"
                  (click)="setCurrentView('hashtags')"
                >
                  <i class="pi pi-hashtag"></i>
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
                  <i class="pi pi-comment"></i>
                  <span>投稿登録</span>
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        <!-- Mobile Sidebar -->
        <p-sidebar
          [(visible)]="sidebarVisible"
          position="left"
          [modal]="true"
          styleClass="w-80"
        >
          <ng-template pTemplate="header">
            <h3 class="font-semibold">メニュー</h3>
          </ng-template>

          <nav class="mt-4">
            <ul class="space-y-2">
              <li>
                <button
                  class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center space-x-3"
                  [class.bg-blue-50]="currentView === 'accounts'"
                  [class.text-blue-600]="currentView === 'accounts'"
                  (click)="setCurrentView('accounts'); sidebarVisible = false"
                >
                  <i class="pi pi-users"></i>
                  <span>SNSアカウント連携</span>
                </button>
              </li>
              <li>
                <button
                  class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center space-x-3"
                  [class.bg-blue-50]="currentView === 'hashtags'"
                  [class.text-blue-600]="currentView === 'hashtags'"
                  (click)="setCurrentView('hashtags'); sidebarVisible = false"
                >
                  <i class="pi pi-hashtag"></i>
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
                  <i class="pi pi-comment"></i>
                  <span>投稿登録</span>
                </button>
              </li>
            </ul>
          </nav>
        </p-sidebar>

        <!-- Main Content -->
        <main class="flex-1 p-6">
          <div class="max-w-4xl mx-auto">
            <div
              *ngIf="currentView === 'accounts'"
              class="bg-white rounded-lg shadow p-6"
            >
              <h2 class="text-xl font-semibold mb-4 flex items-center">
                <i class="pi pi-users mr-2"></i>
                SNSアカウント連携
              </h2>
              <p class="text-gray-600 mb-6">
                各SNSアカウントとの連携を管理します。連携済みのSNSのみ、他の機能で使用できます。
              </p>

              <div class="grid md:grid-cols-2 gap-4">
                <!-- X (Twitter) -->
                <div class="border rounded-lg p-4">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center">
                      <i class="pi pi-twitter text-blue-500 text-xl mr-2"></i>
                      <span class="font-medium">X (Twitter)</span>
                    </div>
                    <span
                      class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded"
                      >DM対応</span
                    >
                  </div>

                  <div
                    *ngIf="getAccountsBySNS('x').length > 0; else xNotConnected"
                  >
                    <div
                      *ngFor="let account of getAccountsBySNS('x')"
                      class="mb-2"
                    >
                      <p class="text-sm font-medium text-green-800">
                        {{ account.username }}
                      </p>
                      <p class="text-xs text-gray-600">
                        {{ account.display_name }}
                      </p>
                    </div>
                  </div>
                  <ng-template #xNotConnected>
                    <p class="text-sm text-gray-600 mb-3">未接続</p>
                  </ng-template>

                  <p-button
                    label="接続する"
                    size="small"
                    [outlined]="true"
                    (onClick)="connectSNS('x')"
                  ></p-button>
                </div>

                <!-- Instagram -->
                <div class="border rounded-lg p-4">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center">
                      <i class="pi pi-instagram text-pink-500 text-xl mr-2"></i>
                      <span class="font-medium">Instagram</span>
                    </div>
                    <span
                      class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                      >接続のみ</span
                    >
                  </div>

                  <div
                    *ngIf="
                      getAccountsBySNS('instagram').length > 0;
                      else igNotConnected
                    "
                  >
                    <div
                      *ngFor="let account of getAccountsBySNS('instagram')"
                      class="mb-2"
                    >
                      <p class="text-sm font-medium text-green-800">
                        {{ account.username }}
                      </p>
                      <p class="text-xs text-gray-600">
                        {{ account.display_name }}
                      </p>
                    </div>
                  </div>
                  <ng-template #igNotConnected>
                    <p class="text-sm text-gray-600 mb-3">未接続</p>
                  </ng-template>

                  <p-button
                    label="接続する"
                    size="small"
                    [outlined]="true"
                    (onClick)="connectSNS('instagram')"
                  ></p-button>
                </div>

                <!-- Threads -->
                <div class="border rounded-lg p-4">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center">
                      <i class="pi pi-comment text-gray-700 text-xl mr-2"></i>
                      <span class="font-medium">Threads</span>
                    </div>
                    <span
                      class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                      >接続のみ</span
                    >
                  </div>

                  <div
                    *ngIf="
                      getAccountsBySNS('threads').length > 0;
                      else threadsNotConnected
                    "
                  >
                    <div
                      *ngFor="let account of getAccountsBySNS('threads')"
                      class="mb-2"
                    >
                      <p class="text-sm font-medium text-green-800">
                        {{ account.username }}
                      </p>
                      <p class="text-xs text-gray-600">
                        {{ account.display_name }}
                      </p>
                    </div>
                  </div>
                  <ng-template #threadsNotConnected>
                    <p class="text-sm text-gray-600 mb-3">未接続</p>
                  </ng-template>

                  <p-button
                    label="接続する"
                    size="small"
                    [outlined]="true"
                    (onClick)="connectSNS('threads')"
                  ></p-button>
                </div>

                <!-- TikTok -->
                <div class="border rounded-lg p-4">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center">
                      <i class="pi pi-video text-red-500 text-xl mr-2"></i>
                      <span class="font-medium">TikTok</span>
                    </div>
                    <span
                      class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                      >接続のみ</span
                    >
                  </div>

                  <div
                    *ngIf="
                      getAccountsBySNS('tiktok').length > 0;
                      else tiktokNotConnected
                    "
                  >
                    <div
                      *ngFor="let account of getAccountsBySNS('tiktok')"
                      class="mb-2"
                    >
                      <p class="text-sm font-medium text-green-800">
                        {{ account.username }}
                      </p>
                      <p class="text-xs text-gray-600">
                        {{ account.display_name }}
                      </p>
                    </div>
                  </div>
                  <ng-template #tiktokNotConnected>
                    <p class="text-sm text-gray-600 mb-3">未接続</p>
                  </ng-template>

                  <p-button
                    label="接続する"
                    size="small"
                    [outlined]="true"
                    (onClick)="connectSNS('tiktok')"
                  ></p-button>
                </div>
              </div>
            </div>

            <div
              *ngIf="currentView === 'hashtags'"
              class="bg-white rounded-lg shadow p-6"
            >
              <h2 class="text-xl font-semibold mb-4 flex items-center">
                <i class="pi pi-hashtag mr-2"></i>
                ハッシュタグ登録
              </h2>
              <p class="text-gray-600 mb-6">
                キャンペーン用ハッシュタグを登録し、該当投稿者へ自動DM送信を設定できます。
              </p>

              <div
                class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"
              >
                <div class="flex">
                  <i
                    class="pi pi-exclamation-triangle text-yellow-600 mr-2 mt-1"
                  ></i>
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
                <i class="pi pi-comment mr-2"></i>
                投稿登録
              </h2>
              <p class="text-gray-600 mb-6">
                特定の投稿へのリプライ投稿者に対して、自動DM送信を設定できます。
              </p>

              <div
                class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"
              >
                <div class="flex">
                  <i
                    class="pi pi-exclamation-triangle text-yellow-600 mr-2 mt-1"
                  ></i>
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
export class DashboardComponent implements OnInit {
  currentView: 'accounts' | 'hashtags' | 'posts' = 'accounts';
  sidebarVisible = false;
  currentUser: any = null;
  connectedAccounts: SNSAccount[] = [];

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

    // SNSアカウント一覧を取得
    this.snsService.accounts$.subscribe((accounts) => {
      this.connectedAccounts = accounts;
    });

    // OAuth認証完了後のコールバック処理
    this.snsService.handleOAuthCallback();
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

  getAccountsBySNS(snsType: string): SNSAccount[] {
    return this.connectedAccounts.filter(
      (account) => account.sns_type === snsType
    );
  }
}
