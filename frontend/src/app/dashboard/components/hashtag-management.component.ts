import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SNSService } from '../../shared/sns.service';

interface Hashtag {
  id: string;
  uid: string;
  sns_type: string;
  account_id: string;
  hashtag: string;
  dm_message: string;
  created_at: string;
  updated_at?: string;
  is_active: boolean;
}

@Component({
  selector: 'app-hashtag-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold flex items-center">
          <span class="mr-2">#</span>
          登録済みハッシュタグ管理
        </h2>
        <button
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          (click)="goToHashtagRegistration()"
        >
          新規登録
        </button>
      </div>

      <!-- 読み込み中表示 -->
      <div *ngIf="loading" class="text-center py-8">
        <div class="text-gray-500">ハッシュタグを読み込み中...</div>
      </div>

      <!-- ハッシュタグが0件の場合 -->
      <div *ngIf="!loading && hashtags.length === 0" class="text-center py-8">
        <div class="text-gray-500 mb-2">登録されたハッシュタグがありません</div>
        <p class="text-sm text-gray-400">「ハッシュタグ登録」タブから新しいハッシュタグを登録してください</p>
      </div>

      <!-- ハッシュタグ一覧 -->
      <div *ngIf="!loading && hashtags.length > 0" class="space-y-4">
        <div
          *ngFor="let hashtag of hashtags; trackBy: trackByHashtagId"
          class="border rounded-lg p-4 hover:bg-gray-50"
        >
          <!-- 表示モード -->
          <div *ngIf="!hashtag.isEditing">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-2">
                  <span class="text-lg font-semibold text-blue-600">#{{ hashtag.hashtag }}</span>
                  <span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    {{ getSNSName(hashtag.sns_type) }}
                  </span>
                </div>
                <div class="text-sm text-gray-600 mb-2">
                  <span class="font-medium">DM内容:</span>
                  <div class="bg-gray-50 p-2 rounded mt-1 whitespace-pre-wrap">{{ hashtag.dm_message }}</div>
                </div>
                <div class="text-xs text-gray-400">
                  登録日: {{ formatDate(hashtag.created_at) }}
                  <span *ngIf="hashtag.updated_at">
                    | 更新日: {{ formatDate(hashtag.updated_at) }}
                  </span>
                </div>
              </div>
              <div class="flex space-x-2 ml-4">
                <button
                  class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  (click)="startEdit(hashtag)"
                >
                  編集
                </button>
                <button
                  class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  (click)="deleteHashtag(hashtag)"
                >
                  削除
                </button>
              </div>
            </div>
          </div>

          <!-- 編集モード -->
          <div *ngIf="hashtag.isEditing">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  ハッシュタグ（#なしで入力）
                </label>
                <input
                  type="text"
                  [(ngModel)]="hashtag.editData.hashtag"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  DM送信メッセージ
                </label>
                <textarea
                  [(ngModel)]="hashtag.editData.dm_message"
                  rows="4"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                ></textarea>
              </div>
              <div class="flex justify-end space-x-2">
                <button
                  class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  (click)="cancelEdit(hashtag)"
                >
                  キャンセル
                </button>
                <button
                  class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  (click)="saveEdit(hashtag)"
                  [disabled]="!hashtag.editData.hashtag.trim() || !hashtag.editData.dm_message.trim()"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- メッセージ表示 -->
      <div *ngIf="message" class="mt-4 p-3 rounded-md" [class]="messageClass">
        {{ message }}
      </div>
    </div>
  `
})
export class HashtagManagementComponent implements OnInit {
  @Output() navigateToView = new EventEmitter<string>();
  
  hashtags: (Hashtag & { isEditing?: boolean; editData?: any })[] = [];
  loading = false;
  message = '';
  messageClass = '';

  constructor(private snsService: SNSService) {}

  ngOnInit() {
    this.loadHashtags();
  }

  async loadHashtags() {
    this.loading = true;
    this.message = '';

    try {
      const hashtags = await this.snsService.getHashtags();
      this.hashtags = hashtags.map(hashtag => ({
        ...hashtag,
        isEditing: false
      }));
    } catch (error: any) {
      this.showMessage('ハッシュタグの読み込みに失敗しました: ' + (error.message || ''), 'error');
    }

    this.loading = false;
  }

  trackByHashtagId(index: number, hashtag: Hashtag): string {
    return hashtag.id;
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

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  startEdit(hashtag: any) {
    hashtag.isEditing = true;
    hashtag.editData = {
      hashtag: hashtag.hashtag,
      dm_message: hashtag.dm_message
    };
  }

  cancelEdit(hashtag: any) {
    hashtag.isEditing = false;
    delete hashtag.editData;
  }

  async saveEdit(hashtag: any) {
    if (!hashtag.editData.hashtag.trim() || !hashtag.editData.dm_message.trim()) {
      return;
    }

    try {
      await this.snsService.updateHashtag({
        hashtag_id: hashtag.id,
        hashtag: hashtag.editData.hashtag,
        dm_message: hashtag.editData.dm_message
      });

      // UIを更新
      hashtag.hashtag = hashtag.editData.hashtag;
      hashtag.dm_message = hashtag.editData.dm_message;
      hashtag.updated_at = new Date().toISOString();
      hashtag.isEditing = false;
      delete hashtag.editData;

      this.showMessage('ハッシュタグが正常に更新されました', 'success');
    } catch (error: any) {
      this.showMessage('更新エラー: ' + (error.message || '更新に失敗しました'), 'error');
    }
  }

  async deleteHashtag(hashtag: any) {
    if (!confirm(`ハッシュタグ「#${hashtag.hashtag}」を削除しますか？`)) {
      return;
    }

    try {
      await this.snsService.deleteHashtag(hashtag.id);
      
      // UIから削除
      this.hashtags = this.hashtags.filter(h => h.id !== hashtag.id);
      
      this.showMessage('ハッシュタグが正常に削除されました', 'success');
    } catch (error: any) {
      this.showMessage('削除エラー: ' + (error.message || '削除に失敗しました'), 'error');
    }
  }

  goToHashtagRegistration() {
    this.navigateToView.emit('hashtags' as any);
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