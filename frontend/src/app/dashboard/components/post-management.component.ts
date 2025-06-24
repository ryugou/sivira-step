import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SNSService } from '../../shared/sns.service';

interface Post {
  id: string;
  uid: string;
  sns_type: string;
  account_id: string;
  post_id: string;
  post_url: string;
  dm_message: string;
  created_at: string;
  updated_at?: string;
  is_active: boolean;
}

@Component({
  selector: 'app-post-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold flex items-center">
          <span class="mr-2">💬</span>
          登録済み投稿管理
        </h2>
        <button
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          (click)="goToPostRegistration()"
        >
          新規登録
        </button>
      </div>

      <!-- 読み込み中表示 -->
      <div *ngIf="loading" class="text-center py-8">
        <div class="text-gray-500">投稿を読み込み中...</div>
      </div>

      <!-- 投稿が0件の場合 -->
      <div *ngIf="!loading && posts.length === 0" class="text-center py-8">
        <div class="text-gray-500 mb-2">登録された投稿がありません</div>
        <p class="text-sm text-gray-400">「投稿登録」タブから新しい投稿を登録してください</p>
      </div>

      <!-- 投稿一覧 -->
      <div *ngIf="!loading && posts.length > 0" class="space-y-4">
        <div
          *ngFor="let post of posts; trackBy: trackByPostId"
          class="border rounded-lg p-4 hover:bg-gray-50"
        >
          <!-- 表示モード -->
          <div *ngIf="!post.isEditing">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-2">
                  <span class="text-lg font-semibold text-blue-600">投稿ID: {{ post.post_id }}</span>
                  <span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    {{ getSNSName(post.sns_type) }}
                  </span>
                </div>
                <div class="text-sm text-gray-600 mb-2" *ngIf="post.post_url">
                  <span class="font-medium">URL:</span>
                  <a 
                    [href]="post.post_url" 
                    target="_blank" 
                    class="text-blue-600 hover:underline ml-1"
                  >
                    {{ post.post_url }}
                  </a>
                </div>
                <div class="text-sm text-gray-600 mb-2">
                  <span class="font-medium">DM内容:</span>
                  <div class="bg-gray-50 p-2 rounded mt-1 whitespace-pre-wrap">{{ post.dm_message }}</div>
                </div>
                <div class="text-xs text-gray-400">
                  登録日: {{ formatDate(post.created_at) }}
                  <span *ngIf="post.updated_at">
                    | 更新日: {{ formatDate(post.updated_at) }}
                  </span>
                </div>
              </div>
              <div class="flex space-x-2 ml-4">
                <button
                  class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  (click)="startEdit(post)"
                >
                  編集
                </button>
                <button
                  class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  (click)="deletePost(post)"
                >
                  削除
                </button>
              </div>
            </div>
          </div>

          <!-- 編集モード -->
          <div *ngIf="post.isEditing">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  投稿URL
                </label>
                <input
                  type="url"
                  [(ngModel)]="post.editData.post_url"
                  placeholder="https://twitter.com/username/status/1234567890"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  投稿ID（自動取得）
                </label>
                <input
                  type="text"
                  [value]="extractPostId(post.editData.post_url)"
                  readonly
                  class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  placeholder="URLから自動的に取得されます"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  DM送信メッセージ
                </label>
                <textarea
                  [(ngModel)]="post.editData.dm_message"
                  rows="4"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                ></textarea>
              </div>
              <div class="flex justify-end space-x-2">
                <button
                  class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  (click)="cancelEdit(post)"
                >
                  キャンセル
                </button>
                <button
                  class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  (click)="saveEdit(post)"
                  [disabled]="!extractPostId(post.editData.post_url) || !post.editData.dm_message.trim()"
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
export class PostManagementComponent implements OnInit {
  @Output() navigateToView = new EventEmitter<string>();
  
  posts: (Post & { isEditing?: boolean; editData?: any })[] = [];
  loading = false;
  message = '';
  messageClass = '';

  constructor(private snsService: SNSService) {}

  ngOnInit() {
    this.loadPosts();
  }

  async loadPosts() {
    this.loading = true;
    this.message = '';

    try {
      const posts = await this.snsService.getPosts();
      this.posts = posts.map(post => ({
        ...post,
        isEditing: false
      }));
    } catch (error: any) {
      this.showMessage('投稿の読み込みに失敗しました: ' + (error.message || ''), 'error');
    }

    this.loading = false;
  }

  trackByPostId(index: number, post: Post): string {
    return post.id;
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

  extractPostId(url: string): string {
    if (!url) return '';
    
    // TwitterのURL形式から投稿IDを抽出
    const twitterMatch = url.match(/twitter\.com\/\w+\/status\/(\d+)/);
    if (twitterMatch) {
      return twitterMatch[1];
    }

    // X.com形式
    const xMatch = url.match(/x\.com\/\w+\/status\/(\d+)/);
    if (xMatch) {
      return xMatch[1];
    }

    return '';
  }

  startEdit(post: any) {
    post.isEditing = true;
    post.editData = {
      post_url: post.post_url,
      dm_message: post.dm_message
    };
  }

  cancelEdit(post: any) {
    post.isEditing = false;
    delete post.editData;
  }

  async saveEdit(post: any) {
    const extractedPostId = this.extractPostId(post.editData.post_url);
    if (!extractedPostId || !post.editData.dm_message.trim()) {
      return;
    }

    try {
      await this.snsService.updatePost({
        post_doc_id: post.id,
        post_id: extractedPostId,
        post_url: post.editData.post_url,
        dm_message: post.editData.dm_message
      });

      // UIを更新
      post.post_id = extractedPostId;
      post.post_url = post.editData.post_url;
      post.dm_message = post.editData.dm_message;
      post.updated_at = new Date().toISOString();
      post.isEditing = false;
      delete post.editData;

      this.showMessage('投稿が正常に更新されました', 'success');
    } catch (error: any) {
      this.showMessage('更新エラー: ' + (error.message || '更新に失敗しました'), 'error');
    }
  }

  async deletePost(post: any) {
    if (!confirm(`投稿ID「${post.post_id}」を削除しますか？`)) {
      return;
    }

    try {
      await this.snsService.deletePost(post.id);
      
      // UIから削除
      this.posts = this.posts.filter(p => p.id !== post.id);
      
      this.showMessage('投稿が正常に削除されました', 'success');
    } catch (error: any) {
      this.showMessage('削除エラー: ' + (error.message || '削除に失敗しました'), 'error');
    }
  }

  goToPostRegistration() {
    this.navigateToView.emit('posts' as any);
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