import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { AuthService } from './auth.service';
import { Observable, BehaviorSubject, from } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SNSAccount {
  id?: string;
  uid?: string;
  sns_type: 'x' | 'instagram' | 'threads' | 'tiktok';
  account_id: string;
  username: string;
  display_name?: string;
  profile_image_url?: string;
  access_token?: string;
  access_token_secret?: string;
  connected_at: string;
  is_active: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SNSService {
  private accountsSubject = new BehaviorSubject<SNSAccount[]>([]);
  public accounts$ = this.accountsSubject.asObservable();

  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private http: HttpClient,
    private functions: Functions
  ) {
    this.authService.user$.subscribe((user) => {
      if (user) {
        this.loadAccounts();
      } else {
        this.accountsSubject.next([]);
      }
    });
  }

  async loadAccounts(): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) return;

    try {
      // HTTP関数版を使用（Firebase Functions v2のcallable functionsの認証バグ回避）
      const idToken = await user.getIdToken(true);

      const url = `${environment.apiBaseUrl}/getConnectedAccountsHttp`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[loadAccounts] Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result && result.success) {
        const accounts = result.accounts as SNSAccount[];
        this.accountsSubject.next(accounts);
      } else {
        console.error('アカウント取得に失敗:', result);
        this.accountsSubject.next([]);
      }
    } catch (error) {
      console.error('アカウント読み込みエラー:', error);

      // フォールバック: 直接Firestoreから取得
      try {
        const accountsRef = collection(
          this.firestore,
          `users/${user.uid}/accounts`
        );
        const q = query(accountsRef, where('is_active', '==', true));
        const snapshot = await getDocs(q);

        const accounts: SNSAccount[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          accounts.push({
            id: doc.id,
            ...data,
            connected_at:
              data['connected_at']?.toDate?.()?.toISOString() ||
              data['connected_at'],
          } as SNSAccount);
        });

        this.accountsSubject.next(accounts);
      } catch (fallbackError) {
        console.error('フォールバック読み込みエラー:', fallbackError);
        this.accountsSubject.next([]);
      }
    }
  }

  getAccountsBySNS(snsType: string): SNSAccount[] {
    return this.accountsSubject.value.filter(
      (account) => account.sns_type === snsType
    );
  }

  getConnectedSNSTypes(): string[] {
    const accounts = this.accountsSubject.value;
    return [...new Set(accounts.map((account) => account.sns_type))];
  }

  async connectSNS(
    snsType: 'x' | 'instagram' | 'threads' | 'tiktok'
  ): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('ユーザーが認証されていません');

    try {
      // HTTP関数版を使用（Firebase Functions v2のcallable functionsの認証バグ回避）
      const idToken = await user.getIdToken(true);

      const url = `${environment.apiBaseUrl}/connectSNSHttp`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ sns_type: snsType }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[connectSNS] Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result && result.success) {
        const authUrl = result.authUrl;

        // ポップアップウィンドウを開く
        const popup = window.open(authUrl, '_blank', 'width=600,height=600,scrollbars=yes,resizable=yes');
        
        // ポップアップからのメッセージを待機
        const messageHandler = (event: MessageEvent) => {
          if (event.data && event.data.type === 'oauth_success') {
            console.log('OAuth success received:', event.data);
            
            // メッセージリスナーを削除
            window.removeEventListener('message', messageHandler);
            
            // アカウント一覧を再読み込み
            this.loadAccounts();
          }
        };
        
        // メッセージリスナーを追加
        window.addEventListener('message', messageHandler);
        
        // ポップアップが閉じられた場合のフォールバック（手動で閉じた場合）
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            // 念のためアカウント一覧を再読み込み
            this.loadAccounts();
          }
        }, 1000);
      } else {
        throw new Error('OAuth URL の取得に失敗しました');
      }
    } catch (error) {
      console.error('SNS接続エラー:', error);

      // フォールバック: テストアカウントを追加
      if (snsType !== 'x') {
        const proceed = confirm(
          `${snsType}の実際のOAuth連携は未実装です。\n\nテストアカウントを追加しますか？`
        );
        if (proceed) {
          await this.addTestAccount(snsType);
        }
      } else {
        throw error;
      }
    }
  }

  async disconnectSNS(accountId: string): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('ユーザーが認証されていません');

    try {
      await deleteDoc(
        doc(this.firestore, `users/${user.uid}/accounts`, accountId)
      );
      await this.loadAccounts(); // リロード
    } catch (error) {
      console.error('SNS切断エラー:', error);
      throw error;
    }
  }

  // テスト用: ダミーアカウントを追加
  async addTestAccount(
    snsType: 'x' | 'instagram' | 'threads' | 'tiktok'
  ): Promise<void> {
    const user = this.authService.currentUser;
    if (!user) throw new Error('ユーザーが認証されていません');

    const testAccount: Omit<SNSAccount, 'id'> = {
      uid: user.uid,
      sns_type: snsType,
      account_id: `test_${snsType}_${Date.now()}`,
      username: `test_${snsType}_user`,
      display_name: `Test ${snsType.toUpperCase()} User`,
      connected_at: new Date().toISOString(),
      is_active: true,
    };

    try {
      const accountsRef = collection(
        this.firestore,
        `users/${user.uid}/accounts`
      );
      await addDoc(accountsRef, testAccount);
      await this.loadAccounts(); // リロード
    } catch (error) {
      console.error('テストアカウント追加エラー:', error);
      throw error;
    }
  }

  // デバッグ用：環境変数確認 (HTTP関数版)
  async debugEnvironment(): Promise<any> {
    try {
      // Firebase Authから明示的にIDトークンを取得
      const user = this.authService.currentUser;
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }

      const idToken = await user.getIdToken(true); // forceRefresh = true

      const url = `${environment.apiBaseUrl}/debugAuthHttp`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[debugEnvironment] Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Environment debug error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  // OAuth認証完了後のリダイレクト処理（ポップアップ版では不要だが互換性のため残す）
  handleOAuthCallback(): void {
    // ポップアップ版ではpostMessageを使用するため、この処理は不要
    // 古いリダイレクト版との互換性のために残しておく
  }
}
