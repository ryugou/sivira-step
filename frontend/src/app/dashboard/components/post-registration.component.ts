import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SNSService, SNSAccount } from '../../shared/sns.service';

@Component({
  selector: 'app-post-registration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4 flex items-center">
        <span class="mr-2">💬</span>
        投稿登録
      </h2>
      <p class="text-gray-600 mb-6">
        特定の投稿へのリプライ投稿者に対して、自動DM送信を設定できます。
      </p>

      <div class="space-y-6">
        <!-- Step 1: SNS選択 -->
        <div>
          <h3 class="text-lg font-medium mb-3">1. SNSを選択</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              *ngFor="let sns of availableSNSTypes"
              class="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              [class.border-blue-500]="selectedSNSType === sns"
              [class.bg-blue-50]="selectedSNSType === sns"
              [class.border-gray-300]="selectedSNSType !== sns"
              (click)="selectSNS(sns)"
            >
              <div class="text-center">
                <span class="text-2xl mb-2 block">{{ getSNSIcon(sns) }}</span>
                <span class="text-sm font-medium">{{ getSNSName(sns) }}</span>
                <div class="text-xs text-gray-500 mt-1">
                  {{ getAccountsBySNS(sns).length }}アカウント
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Step 2: アカウント選択 -->
        <div *ngIf="selectedSNSType">
          <h3 class="text-lg font-medium mb-3">2. アカウントを選択</h3>
          <div class="space-y-2">
            <div
              *ngFor="let account of getAccountsBySNS(selectedSNSType)"
              class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
              [class.border-blue-500]="selectedAccount?.id === account.id"
              [class.bg-blue-50]="selectedAccount?.id === account.id"
              [class.border-gray-300]="selectedAccount?.id !== account.id"
              (click)="selectAccount(account)"
            >
              <input
                type="radio"
                [checked]="selectedAccount?.id === account.id"
                class="mr-3"
                readonly
              />
              <div class="flex-1">
                <div class="font-medium">{{ '@' + account.username }}</div>
                <div class="text-sm text-gray-500">{{ account.display_name }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 3: 投稿URL入力 -->
        <div *ngIf="selectedAccount">
          <h3 class="text-lg font-medium mb-3">3. 投稿URLを入力</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                投稿のURL
              </label>
              <input
                type="url"
                [(ngModel)]="postUrl"
                placeholder="https://twitter.com/username/status/1234567890"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p class="text-xs text-gray-500 mt-1">
                監視したい投稿のURLを入力してください
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                投稿ID（自動取得）
              </label>
              <input
                type="text"
                [value]="extractedPostId"
                readonly
                class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                placeholder="URLから自動的に取得されます"
              />
              <p class="text-xs text-gray-500 mt-1">
                URLから投稿IDが自動的に抽出されます
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                DM送信メッセージ
              </label>
              <textarea
                [(ngModel)]="dmMessage"
                rows="4"
                placeholder="リプライありがとうございます！こちらのURLからNFTを取得してください: https://example.com/nft"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
              <p class="text-xs text-gray-500 mt-1">
                リプライ投稿者に送信されるDMの内容を入力してください
              </p>
            </div>
          </div>
        </div>

        <!-- 登録ボタン -->
        <div *ngIf="selectedAccount && extractedPostId" class="flex justify-end space-x-3">
          <button
            type="button"
            class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            (click)="resetForm()"
          >
            リセット
          </button>
          <button
            type="button"
            class="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            [disabled]="loading || !extractedPostId || !dmMessage.trim()"
            (click)="registerPost()"
          >
            {{ loading ? '登録中...' : '投稿を登録' }}
          </button>
        </div>

        <!-- X以外のSNS選択時の警告 -->
        <div *ngIf="selectedSNSType && selectedSNSType !== 'x'" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div class="flex">
            <span class="text-yellow-600 mr-2">⚠️</span>
            <div>
              <p class="font-medium text-yellow-800">現在未対応です</p>
              <p class="text-sm text-yellow-700">
                {{ getSNSName(selectedSNSType) }}でのリプライ監視とDM送信は現在未対応です。
              </p>
            </div>
          </div>
        </div>

        <!-- メッセージ表示 -->
        <div *ngIf="message" class="p-3 rounded-md" [class]="messageClass">
          {{ message }}
        </div>
      </div>
    </div>
  `
})
export class PostRegistrationComponent implements OnInit {
  @Output() registrationComplete = new EventEmitter<void>();
  
  selectedSNSType: string | null = null;
  selectedAccount: SNSAccount | null = null;
  postUrl = '';
  dmMessage = '';
  loading = false;
  message = '';
  messageClass = '';

  constructor(private snsService: SNSService) {}

  ngOnInit() {
    this.snsService.loadAccounts();
  }

  get availableSNSTypes(): string[] {
    return this.snsService.getConnectedSNSTypes();
  }

  get extractedPostId(): string {
    if (!this.postUrl) return '';
    
    // TwitterのURL形式から投稿IDを抽出
    const twitterMatch = this.postUrl.match(/twitter\.com\/\w+\/status\/(\d+)/);
    if (twitterMatch) {
      return twitterMatch[1];
    }

    // X.com形式
    const xMatch = this.postUrl.match(/x\.com\/\w+\/status\/(\d+)/);
    if (xMatch) {
      return xMatch[1];
    }

    return '';
  }

  getAccountsBySNS(snsType: string): SNSAccount[] {
    return this.snsService.getAccountsBySNS(snsType);
  }

  getSNSIcon(snsType: string): string {
    const icons: { [key: string]: string } = {
      'x': '🐦',
      'instagram': '📷',
      'threads': '🧵',
      'tiktok': '🎵'
    };
    return icons[snsType] || '📱';
  }

  getSNSName(snsType: string): string {
    const names: { [key: string]: string } = {
      'x': 'X (Twitter)',
      'instagram': 'Instagram',
      'threads': 'Threads',
      'tiktok': 'TikTok'
    };
    return names[snsType] || snsType;
  }

  selectSNS(snsType: string) {
    this.selectedSNSType = snsType;
    this.selectedAccount = null;
    this.message = '';
  }

  selectAccount(account: SNSAccount) {
    this.selectedAccount = account;
    this.message = '';
  }

  async registerPost() {
    if (!this.selectedAccount || !this.extractedPostId || !this.dmMessage.trim()) {
      return;
    }

    if (this.selectedSNSType !== 'x') {
      this.showMessage('現在X（Twitter）のみ対応しています', 'error');
      return;
    }

    this.loading = true;
    this.message = '';

    try {
      // SNSServiceのregisterPostメソッドを呼び出し
      await this.snsService.registerPost({
        sns_type: this.selectedSNSType,
        account_id: this.selectedAccount.id!,
        post_id: this.extractedPostId,
        post_url: this.postUrl,
        dm_message: this.dmMessage
      });

      this.showMessage('投稿が正常に登録されました', 'success');
      this.resetForm();
      
      // 2秒後に管理画面に戻る
      setTimeout(() => {
        this.registrationComplete.emit();
      }, 2000);
    } catch (error: any) {
      this.showMessage('登録エラー: ' + (error.message || '登録に失敗しました'), 'error');
    }

    this.loading = false;
  }

  resetForm() {
    this.selectedSNSType = null;
    this.selectedAccount = null;
    this.postUrl = '';
    this.dmMessage = '';
    this.message = '';
  }

  private showMessage(text: string, type: 'success' | 'error') {
    this.message = text;
    this.messageClass = type === 'success' 
      ? 'bg-green-100 text-green-700 border border-green-300'
      : 'bg-red-100 text-red-700 border border-red-300';
    
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }
}