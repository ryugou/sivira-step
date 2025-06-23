import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SNSService, SNSAccount } from '../../shared/sns.service';

@Component({
  selector: 'app-sns-accounts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4 flex items-center">
        <span class="mr-2">👥</span>
        SNSアカウント連携
      </h2>
      <p class="text-gray-600 mb-6">各SNSアカウントとの連携を管理します。連携済みのSNSのみ、他の機能で使用できます。</p>
      
      <div class="grid md:grid-cols-2 gap-4">
        <!-- X (Twitter) -->
        <div class="border rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <span class="text-blue-500 text-xl mr-2">🐦</span>
              <span class="font-medium">X (Twitter)</span>
            </div>
            <span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">DM対応</span>
          </div>
          
          <div *ngIf="getAccountsBySNS('x').length === 0" class="mb-3">
            <p class="text-sm text-gray-600 mb-3">未接続</p>
            <div class="space-y-2">
              <button 
                class="w-full px-3 py-2 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
                (click)="connectSNS('x')"
                [disabled]="loading"
              >
                {{ loading ? '接続中...' : '接続する' }}
              </button>
              <button 
                class="w-full px-3 py-2 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
                (click)="addTestAccount('x')"
                [disabled]="loading"
              >
                テストアカウント追加
              </button>
            </div>
          </div>
          
          <div *ngIf="getAccountsBySNS('x').length > 0">
            <div *ngFor="let account of getAccountsBySNS('x')" class="mb-2 p-2 bg-green-50 rounded border border-green-200">
              <div class="flex justify-between items-center">
                <div>
                  <p class="text-sm font-medium text-green-800">{{ account.username }}</p>
                  <p class="text-xs text-green-600">接続済み</p>
                </div>
                <button 
                  class="text-xs text-red-600 hover:text-red-800"
                  (click)="disconnectSNS(account.id!)"
                  [disabled]="loading"
                >
                  切断
                </button>
              </div>
            </div>
            <button 
              class="w-full px-3 py-2 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50 mt-2"
              (click)="connectSNS('x')"
              [disabled]="loading"
            >
              別のアカウントを追加
            </button>
          </div>
        </div>
        
        <!-- Instagram -->
        <div class="border rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <span class="text-pink-500 text-xl mr-2">📷</span>
              <span class="font-medium">Instagram</span>
            </div>
            <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">接続のみ</span>
          </div>
          
          <div *ngIf="getAccountsBySNS('instagram').length === 0" class="mb-3">
            <p class="text-sm text-gray-600 mb-3">未接続</p>
            <div class="space-y-2">
              <button 
                class="w-full px-3 py-2 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
                (click)="connectSNS('instagram')"
                [disabled]="loading"
              >
                {{ loading ? '接続中...' : '接続する' }}
              </button>
              <button 
                class="w-full px-3 py-2 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
                (click)="addTestAccount('instagram')"
                [disabled]="loading"
              >
                テストアカウント追加
              </button>
            </div>
          </div>
          
          <div *ngIf="getAccountsBySNS('instagram').length > 0">
            <div *ngFor="let account of getAccountsBySNS('instagram')" class="mb-2 p-2 bg-green-50 rounded border border-green-200">
              <div class="flex justify-between items-center">
                <div>
                  <p class="text-sm font-medium text-green-800">{{ account.username }}</p>
                  <p class="text-xs text-green-600">接続済み</p>
                </div>
                <button 
                  class="text-xs text-red-600 hover:text-red-800"
                  (click)="disconnectSNS(account.id!)"
                  [disabled]="loading"
                >
                  切断
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Threads -->
        <div class="border rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <span class="text-gray-700 text-xl mr-2">🧵</span>
              <span class="font-medium">Threads</span>
            </div>
            <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">接続のみ</span>
          </div>
          
          <div *ngIf="getAccountsBySNS('threads').length === 0" class="mb-3">
            <p class="text-sm text-gray-600 mb-3">未接続</p>
            <div class="space-y-2">
              <button 
                class="w-full px-3 py-2 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
                (click)="connectSNS('threads')"
                [disabled]="loading"
              >
                {{ loading ? '接続中...' : '接続する' }}
              </button>
              <button 
                class="w-full px-3 py-2 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
                (click)="addTestAccount('threads')"
                [disabled]="loading"
              >
                テストアカウント追加
              </button>
            </div>
          </div>
          
          <div *ngIf="getAccountsBySNS('threads').length > 0">
            <div *ngFor="let account of getAccountsBySNS('threads')" class="mb-2 p-2 bg-green-50 rounded border border-green-200">
              <div class="flex justify-between items-center">
                <div>
                  <p class="text-sm font-medium text-green-800">{{ account.username }}</p>
                  <p class="text-xs text-green-600">接続済み</p>
                </div>
                <button 
                  class="text-xs text-red-600 hover:text-red-800"
                  (click)="disconnectSNS(account.id!)"
                  [disabled]="loading"
                >
                  切断
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- TikTok -->
        <div class="border rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <span class="text-red-500 text-xl mr-2">🎵</span>
              <span class="font-medium">TikTok</span>
            </div>
            <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">接続のみ</span>
          </div>
          
          <div *ngIf="getAccountsBySNS('tiktok').length === 0" class="mb-3">
            <p class="text-sm text-gray-600 mb-3">未接続</p>
            <div class="space-y-2">
              <button 
                class="w-full px-3 py-2 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
                (click)="connectSNS('tiktok')"
                [disabled]="loading"
              >
                {{ loading ? '接続中...' : '接続する' }}
              </button>
              <button 
                class="w-full px-3 py-2 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
                (click)="addTestAccount('tiktok')"
                [disabled]="loading"
              >
                テストアカウント追加
              </button>
            </div>
          </div>
          
          <div *ngIf="getAccountsBySNS('tiktok').length > 0">
            <div *ngFor="let account of getAccountsBySNS('tiktok')" class="mb-2 p-2 bg-green-50 rounded border border-green-200">
              <div class="flex justify-between items-center">
                <div>
                  <p class="text-sm font-medium text-green-800">{{ account.username }}</p>
                  <p class="text-xs text-green-600">接続済み</p>
                </div>
                <button 
                  class="text-xs text-red-600 hover:text-red-800"
                  (click)="disconnectSNS(account.id!)"
                  [disabled]="loading"
                >
                  切断
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 成功/エラーメッセージ -->
      <div *ngIf="message" class="mt-4 p-3 rounded-md" [class]="messageClass">
        {{ message }}
      </div>
    </div>
  `
})
export class SNSAccountsComponent implements OnInit {
  loading = false;
  message = '';
  messageClass = '';

  constructor(private snsService: SNSService) {}

  ngOnInit() {
    this.snsService.loadAccounts();
  }

  getAccountsBySNS(snsType: string): SNSAccount[] {
    return this.snsService.getAccountsBySNS(snsType);
  }

  async connectSNS(snsType: 'x' | 'instagram' | 'threads' | 'tiktok') {
    this.loading = true;
    this.message = '';
    
    try {
      await this.snsService.connectSNS(snsType);
    } catch (error: any) {
      this.showMessage(`${snsType}の接続エラー: ` + (error.message || '接続に失敗しました'), 'error');
    }
    
    this.loading = false;
  }

  async disconnectSNS(accountId: string) {
    if (!confirm('このアカウントの接続を解除しますか？')) return;
    
    this.loading = true;
    this.message = '';
    
    try {
      await this.snsService.disconnectSNS(accountId);
      this.showMessage('アカウントの接続を解除しました', 'success');
    } catch (error: any) {
      this.showMessage('切断エラー: ' + (error.message || '切断に失敗しました'), 'error');
    }
    
    this.loading = false;
  }

  async addTestAccount(snsType: 'x' | 'instagram' | 'threads' | 'tiktok') {
    this.loading = true;
    this.message = '';
    
    try {
      await this.snsService.addTestAccount(snsType);
      this.showMessage(`${snsType}のテストアカウントを追加しました`, 'success');
    } catch (error: any) {
      this.showMessage('テストアカウント追加エラー: ' + (error.message || '追加に失敗しました'), 'error');
    }
    
    this.loading = false;
  }


  private showMessage(message: string, type: 'success' | 'error') {
    this.message = message;
    this.messageClass = type === 'success' 
      ? 'bg-green-100 text-green-700 border border-green-300'
      : 'bg-red-100 text-red-700 border border-red-300';
    
    // 3秒後にメッセージを消す
    setTimeout(() => {
      this.message = '';
    }, 3000);
  }
}